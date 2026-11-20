import { createController, type Middleware } from 'remix/router'
import { formData } from 'remix/middleware/form-data'
import { createRedirectResponse } from 'remix/response/redirect'

import {
  adminEnabled,
  clearFailures,
  endSession,
  insecureInProduction,
  isLoggedIn,
  isSecure,
  loginBlocked,
  passwordMatches,
  recordFailure,
  sameOrigin,
  startSession,
} from '../../admin/auth.ts'
import { collections, isKind, type Values } from '../../admin/collections.ts'
import { saveSiteValues, siteFields, siteValues } from '../../admin/site.ts'
import { FormPage, ListPage, LoginPage, OverviewPage } from '../../admin/ui.tsx'
import { deleteUpload, saveUpload } from '../../admin/uploads.ts'
import { store } from '../../data/store.ts'
import { routes } from '../../routes.ts'
import { resumeHref } from '../../ui/layout.tsx'

const UPLOAD_LIMIT = 6 * 1024 * 1024
/** No single text field is longer than this; the biggest are the project story and the about text. */
const MAX_FIELD_LENGTH = 30_000
const MAX_FIELDS = 40

function notFound() {
  return new Response('Not Found', { status: 404 })
}

function redirect(location: string, headers?: HeadersInit) {
  return createRedirectResponse(location, { status: 303, headers })
}

/**
 * What every admin response says to the browser: never cache it, keep it out of search, and never run
 * anything but this site's own stylesheet. There is no script on these pages at all.
 */
const ADMIN_CSP = [
  "default-src 'none'",
  "style-src 'self'",
  "img-src 'self' https:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
].join('; ')

function protect(response: Response, request: Request): Response {
  let headers = response.headers
  headers.set('Cache-Control', 'no-store')
  headers.set('Pragma', 'no-cache')
  headers.set('X-Robots-Tag', 'noindex, nofollow')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'no-referrer')
  headers.set('Content-Security-Policy', ADMIN_CSP)
  headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  if (isSecure(request)) headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  return response
}

/** Runs the action, turning a failure into a plain page: a visitor never sees a stack trace. */
async function run(context: { request: Request }, next: () => Promise<Response>): Promise<Response> {
  try {
    return protect(await next(), context.request)
  } catch (error) {
    console.error('admin request failed', error)
    let tooBig = error instanceof Error && /max|limit|exceed|too large/i.test(error.message)
    return protect(
      new Response(tooBig ? 'That upload is too large.' : 'Something went wrong.', { status: tooBig ? 413 : 500 }),
      context.request,
    )
  }
}

/** The checks before anything else: https in production, a form post from this site, and a login. */
function checks(request: Request, options: { login: boolean }): Response | null {
  if (!adminEnabled()) return notFound()
  if (insecureInProduction(request)) {
    let url = new URL(request.url)
    url.protocol = 'https:'
    url.host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host
    return redirect(url.toString())
  }
  if (request.method !== 'GET' && request.method !== 'HEAD' && !sameOrigin(request)) {
    return new Response('Forbidden', { status: 403 })
  }
  if (!options.login && !isLoggedIn(request)) return redirect(routes.admin.login.index.href())
  return null
}

const guard: Middleware = async (context, next) => {
  let refusal = checks(context.request, { login: false })
  return refusal ? protect(refusal, context.request) : run(context, next)
}

const loginGuard: Middleware = async (context, next) => {
  let refusal = checks(context.request, { login: true })
  return refusal ? protect(refusal, context.request) : run(context, next)
}

function valuesOf(data: FormData): { values: Values; files: Map<string, File> } | null {
  let values: Values = {}
  let files = new Map<string, File>()
  let count = 0
  for (let [name, value] of data) {
    if (++count > MAX_FIELDS) return null
    if (typeof value === 'string') {
      if (value.length > MAX_FIELD_LENGTH) return null
      values[name] = value
    } else if (value.size > 0) files.set(name, value)
  }
  return { values, files }
}

const TOO_BIG = () => new Response('Too much text in one field.', { status: 413 })

export const loginController = createController(routes.admin.login, {
  middleware: [loginGuard, formData({ maxFiles: 0, maxParts: 5 })],
  actions: {
    index(context) {
      if (isLoggedIn(context.request)) return redirect(routes.admin.home.href())
      return context.render(<LoginPage />)
    },
    async action(context) {
      if (loginBlocked(context.request)) {
        return context.render(<LoginPage error="Too many attempts. Try again in a few minutes." />, { status: 429 })
      }
      let password = String(context.formData.get('password') ?? '').slice(0, 200)
      if (!passwordMatches(password)) {
        recordFailure(context.request)
        // A pause on every wrong guess slows guessing down further.
        await new Promise((resolve) => setTimeout(resolve, 400))
        return context.render(<LoginPage error="That password is not right." />, { status: 401 })
      }
      clearFailures()
      return redirect(routes.admin.home.href(), { 'Set-Cookie': startSession(context.request) })
    },
  },
})

export default createController(routes.admin, {
  middleware: [guard, formData({ maxFileSize: UPLOAD_LIMIT, maxFiles: 2, maxParts: MAX_FIELDS + 2, maxTotalSize: UPLOAD_LIMIT * 2 })],
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
      return redirect(routes.admin.login.index.href(), { 'Set-Cookie': endSession(context.request) })
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
      let parsed = valuesOf(context.formData)
      if (!parsed) return TOO_BIG()
      let { values, files } = parsed
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

      let parsed = valuesOf(context.formData)
      if (!parsed) return TOO_BIG()
      let { values, files } = parsed
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

