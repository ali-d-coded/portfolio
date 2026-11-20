import { createController } from 'remix/router'

import { readUpload } from '../admin/uploads.ts'
import { assets } from '../assets.ts'
import { store } from '../data/store.ts'
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
        },
      })
    },
  },
})
