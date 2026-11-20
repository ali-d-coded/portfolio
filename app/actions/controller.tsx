import { createController } from 'remix/router'

import { sameOrigin } from '../admin/auth.ts'
import { readUpload } from '../admin/uploads.ts'
import { assets } from '../assets.ts'
import { store } from '../data/store.ts'
import { buildMail, checkMessage, getMailer, takeSlot } from '../mail.ts'
import { routes } from '../routes.ts'
import { loadFrame } from '../ui/layout.tsx'
import { AboutPage } from './about-page.tsx'
import { ContactPage } from './contact-page.tsx'
import { HomePage } from './home-page.tsx'

export default createController(routes, {
  actions: {
    async assets(context) {
      return (await assets.fetch(context.request)) ?? new Response('Not Found', { status: 404 })
    },
    async home(context) {
      let [frame, skillGroups, media] = await Promise.all([
        loadFrame(store),
        store.listSkillGroups(),
        store.listMedia(),
      ])
      return context.render(
        <HomePage
          frame={frame}
          skillGroups={skillGroups}
          media={new Map(media.map((item) => [item.id, item]))}
        />,
      )
    },
    async about(context) {
      return context.render(<AboutPage frame={await loadFrame(store)} />)
    },
    async contact(context) {
      return context.render(<ContactPage frame={await loadFrame(store)} />)
    },
    /** The contact form's send: a visitor's message, mailed to the site owner. */
    async mail(context) {
      let { request } = context
      let reply = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
        })

      if (!sameOrigin(request)) return reply({ error: 'This request was refused.' }, 403)
      if (Number(request.headers.get('content-length') ?? 0) > 20_000) {
        return reply({ error: 'That message is too long.' }, 413)
      }

      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return reply({ error: 'That message could not be read.' }, 400)
      }

      // Bots fill the hidden field, or post within a moment of the form opening. They are told it worked.
      let opened = typeof body.t === 'number' ? body.t : 0
      if (typeof body.website === 'string' && body.website !== '') return reply({ ok: true })
      if (opened < 1500) return reply({ ok: true })

      let checked = checkMessage(body)
      if (!checked.ok) return reply({ errors: checked.errors }, 400)

      let site = await store.getSite()
      let to = process.env.MAIL_TO || site?.email
      let mailer = getMailer()
      if (!to || !mailer.ready) return reply({ error: 'Messages cannot be sent from this site yet. Please use the email address instead.' }, 503)
      if (!takeSlot(request)) return reply({ error: 'That is a lot of messages. Please try again later.' }, 429)

      try {
        await mailer.send(buildMail(checked.message, to))
      } catch (error) {
        console.error('mail failed', error)
        return reply({ error: 'The message could not be sent. Please try again, or use the email address.' }, 502)
      }
      return reply({ ok: true })
    },

    async media(context) {
      let media = await store.getMedia(context.params.id)
      let bytes = media ? await readUpload(media) : null
      if (!media || !bytes) return new Response('Not Found', { status: 404 })
      return new Response(new Uint8Array(bytes), {
        headers: {
          'Content-Type': media.contentType,
          'Content-Length': String(bytes.length),
          'Cache-Control': 'public, max-age=3600',
          'X-Content-Type-Options': 'nosniff',
          // Even if an image were not what it claims, it can run nothing from this address. (A PDF needs
          // the browser's viewer, which a sandbox would block.)
          ...(media.contentType === 'application/pdf'
            ? {}
            : { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox" }),
        },
      })
    },
  },
})
