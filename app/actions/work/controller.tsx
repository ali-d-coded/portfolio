import { createController } from 'remix/router'

import { store } from '../../data/store.ts'
import { routes } from '../../routes.ts'
import { loadFrame } from '../../ui/layout.tsx'
import { NotFoundPage } from '../not-found-page.tsx'
import { WorkPage } from '../work-page.tsx'
import { ProjectPage } from './project-page.tsx'

export default createController(routes.work, {
  actions: {
    async index(context) {
      let frame = await loadFrame(store)
      return context.render(<WorkPage frame={frame} />)
    },
    async show(context) {
      let frame = await loadFrame(store)
      let project = await store.getProjectBySlug(context.params.slug)
      if (!project || !project.published) {
        return context.render(<NotFoundPage frame={frame} />, { status: 404 })
      }
      let media = new Map((await store.listMedia()).map((item) => [item.id, item]))
      return context.render(<ProjectPage frame={frame} project={project} media={media} />)
    },
  },
})
