import { createController } from 'remix/router'

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
    media() {
      // Uploads arrive with the admin area; until then no media is served.
      return new Response('Not Found', { status: 404 })
    },
  },
})
