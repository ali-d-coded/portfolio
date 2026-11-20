import { createRouter, type RouterContext } from 'remix/router'
import { render } from 'remix/middleware/render'
import { staticFiles } from 'remix/middleware/static'

import adminController, { loginController } from './actions/admin/controller.tsx'
import controller from './actions/controller.tsx'
import { renderNotFound } from './actions/not-found-page.tsx'
import workController from './actions/work/controller.tsx'
import { assets } from './assets.ts'
import { routes } from './routes.ts'

export const router = createRouter({
  middleware: [staticFiles('./public', { index: false }), render({ assets })],
  defaultHandler: renderNotFound,
})

export type AppContext = RouterContext<typeof router>

declare module 'remix' {
  interface RouterTypes {
    context: AppContext
  }
}

router.map(routes, controller)
router.map(routes.admin.login, loginController)
router.map(routes.admin, adminController)
router.map(routes.work, workController)
