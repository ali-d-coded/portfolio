import { createController, type Middleware } from 'remix/router'
import { formData } from 'remix/middleware/form-data'
import { createRedirectResponse } from 'remix/response/redirect'

import {
  adminEnabled,
  clearFailures,
  isLoggedIn,
  loginBlocked,
  loginCookie,
  logoutCookie,
  passwordMatches,
  recordFailure,
  sameOrigin,
} from '../../admin/auth.ts'
import { collections, isKind, type Values } from '../../admin/collections.ts'
import { saveSiteValues, siteFields, siteValues } from '../../admin/site.ts'
import { FormPage, ListPage, LoginPage, OverviewPage } from '../../admin/ui.tsx'
import { deleteUpload, saveUpload } from '../../admin/uploads.ts'
import { store } from '../../data/store.ts'
import { routes } from '../../routes.ts'
import { resumeHref } from '../../ui/layout.tsx'

const UPLOAD_LIMIT = 6 * 1024 * 1024

function notFound() {
  return new Response('Not Found', { status: 404 })
}

function redirect(location: string, headers?: HeadersInit) {
  return createRedirectResponse(location, { status: 303, headers })
}

/** Noindex and no caching on every admin response. */
function protect(response: Response): Response {
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  response.headers.set('X-Frame-Options', 'DENY')
  return response
}

/** Everything but sign-in needs a login; a form post from another site is refused before it runs. */
const guard: Middleware = async (context, next) => {
  if (!adminEnabled()) return notFound()
  if (context.request.method !== 'GET' && context.request.method !== 'HEAD' && !sameOrigin(context.request)) {
    return new Response('Forbidden', { status: 403 })
  }
  if (!isLoggedIn(context.request)) return redirect(routes.admin.login.index.href())
  return protect(await next())
}

const loginGuard: Middleware = async (context, next) => {
  if (!adminEnabled()) return notFound()
  if (context.request.method === 'POST' && !sameOrigin(context.request)) {
    return new Response('Forbidden', { status: 403 })
  }
  return protect(await next())
}

function valuesOf(data: FormData): { values: Values; files: Map<string, File> } {
  let values: Values = {}
  let files = new Map<string, File>()
  for (let [name, value] of data) {
    if (typeof value === 'string') values[name] = value
    else if (value.size > 0) files.set(name, value)
  }
  return { values, files }
}

export const loginController = createController(routes.admin.login, {
  middleware: [loginGuard, formData({ maxFiles: 0 })],
  actions: {
    index(context) {
      if (isLoggedIn(context.request)) return redirect(routes.admin.home.href())
      return context.render(<LoginPage />)
    },
    async action(context) {
      if (loginBlocked()) {
        return context.render(<LoginPage error="Too many attempts. Try again in a few minutes." />, { status: 429 })
      }
      let password = String(context.formData.get('password') ?? '')
      if (!passwordMatches(password)) {
        recordFailure()
        return context.render(<LoginPage error="That password is not right." />, { status: 401 })
      }
      clearFailures()
      return redirect(routes.admin.home.href(), { 'Set-Cookie': loginCookie(context.request) })
    },
  },
})

export default createController(routes.admin, {
  middleware: [guard, formData({ maxFileSize: UPLOAD_LIMIT, maxFiles: 2, maxTotalSize: UPLOAD_LIMIT * 2 })],
  actions: {
    async home(context) {
      let [projects, experience, skills] = await Promise.all([
        store.listProjects(),
        store.listExperience(),
        store.listSkillGroups(),
      ])
      let persistent = !process.env.RENDER || process.env.CONTENT_PERSISTENT === '1'
      return context.render(
        <OverviewPage
          counts={{ projects: projects.length, experience: experience.length, skills: skills.length }}
          drafts={projects.filter((project) => !project.published).length}
          persistent={persistent}
        />,
      )
    },

    async backup() {
      let snapshot = await store.exportAll()
      let day = new Date().toISOString().slice(0, 10)
      return new Response(JSON.stringify(snapshot, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="content-${day}.json"`,
        },
      })
    },

    logout(context) {
      return redirect(routes.admin.login.index.href(), { 'Set-Cookie': logoutCookie(context.request) })
    },

    async site(context) {
      let site = await store.getSite()
      let flash = context.url.searchParams.has('saved') ? 'Saved.' : undefined
      return context.render(
        <FormPage
          title="Site"
          active="site"
          action={routes.admin.saveSite.href()}
          fields={siteFields}
          values={siteValues(site, resumeHref(site))}
          backHref={routes.admin.home.href()}
          flash={flash}
        />,
      )
    },

    async saveSite(context) {
      let { values, files } = valuesOf(context.formData)
      let result = await saveSiteValues(store, values)
      let errors = result.ok ? {} : result.errors

      // A new resume replaces the old one: the file and its record are removed once the new one is saved.
      let upload = files.get('resumeUpload')
      if (result.ok && upload) {
        let saved = await saveUpload(store, upload, 'Resume', 'pdf')
        let site = await store.getSite()
        if (saved.ok && site) {
          let previous = site.resumeMediaId ? await store.getMedia(site.resumeMediaId) : null
          await store.saveSite({ ...site, resumeMediaId: saved.media.id })
          if (previous) await deleteUpload(store, previous)
        } else if (!saved.ok) {
          errors = { resume: saved.error }
        }
      }

      if (Object.keys(errors).length > 0) {
        return context.render(
          <FormPage
            title="Site"
            active="site"
            action={routes.admin.saveSite.href()}
            fields={siteFields}
            values={{ ...values, resume: resumeHref(await store.getSite()) }}
            errors={errors}
            backHref={routes.admin.home.href()}
          />,
          { status: 400 },
        )
      }
      return redirect(`${routes.admin.site.href()}?saved=1`)
    },

    async list(context) {
      let kind = context.params.kind
      if (!isKind(kind)) return notFound()
      let flash = context.url.searchParams.has('saved')
        ? 'Saved.'
        : context.url.searchParams.has('deleted')
          ? 'Deleted.'
          : undefined
      return context.render(<ListPage kind={kind} rows={await collections[kind].rows(store)} flash={flash} />)
    },

    async edit(context) {
      let { kind, id } = context.params
      if (!isKind(kind)) return notFound()
      let collection = collections[kind]
      let creating = id === 'new'
      let values = creating ? collection.blank : await collection.values(store, id)
      if (!values) return notFound()
      let flash = context.url.searchParams.has('saved') ? 'Saved.' : undefined
      return context.render(
        <FormPage
          title={creating ? `New ${collection.singular}` : `Edit ${collection.singular}`}
          active={kind}
          action={routes.admin.save.href({ kind, id })}
          fields={collection.fields}
          values={values}
          backHref={routes.admin.list.href({ kind })}
          deleteAction={creating ? undefined : routes.admin.remove.href({ kind, id })}
          flash={flash}
        />,
      )
    },

    async save(context) {
      let { kind, id } = context.params
      if (!isKind(kind)) return notFound()
      let collection = collections[kind]
      let creating = id === 'new'
      if (!creating && !(await collection.values(store, id))) return notFound()

      let { values, files } = valuesOf(context.formData)
      let uploadError: string | undefined
      let upload = files.get('previewImageUpload')
      if (upload) {
        let saved = await saveUpload(store, upload, values.title ?? '')
        if (saved.ok) values.previewImage = `/media/${saved.media.id}`
        else uploadError = saved.error
      }

      let result = uploadError ? null : await collection.save(store, creating ? null : id, values)
      if (!result || !result.ok) {
        let errors = result && !result.ok ? result.errors : { previewImage: uploadError ?? '' }
        return context.render(
          <FormPage
            title={creating ? `New ${collection.singular}` : `Edit ${collection.singular}`}
            active={kind}
            action={routes.admin.save.href({ kind, id })}
            fields={collection.fields}
            values={values}
            errors={errors}
            backHref={routes.admin.list.href({ kind })}
            deleteAction={creating ? undefined : routes.admin.remove.href({ kind, id })}
          />,
          { status: 400 },
        )
      }
      return redirect(`${routes.admin.edit.href({ kind, id: result.item.id })}?saved=1`)
    },

    async remove(context) {
      let { kind, id } = context.params
      if (!isKind(kind)) return notFound()
      await collections[kind].remove(store, id)
      return redirect(`${routes.admin.list.href({ kind })}?deleted=1`)
    },

    async move(context) {
      let { kind, id } = context.params
      if (!isKind(kind)) return notFound()
      let collection = collections[kind]
      let ids = (await collection.rows(store)).map((row) => row.id)
      let from = ids.indexOf(id)
      let to = from + (context.formData.get('dir') === 'up' ? -1 : 1)
      if (from >= 0 && to >= 0 && to < ids.length) {
        ;[ids[from], ids[to]] = [ids[to]!, ids[from]!]
        await collection.reorder(store, ids)
      }
      return redirect(routes.admin.list.href({ kind }))
    },
  },
})

