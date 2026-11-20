import { createRouter, type Middleware, type RouterContext } from 'remix/router'
import { render } from 'remix/middleware/render'
import { staticFiles } from 'remix/middleware/static'

import adminController, { loginController } from './actions/admin/controller.tsx'
import controller from './actions/controller.tsx'
import { renderNotFound } from './actions/not-found-page.tsx'
import workController from './actions/work/controller.tsx'
import { assets } from './assets.ts'
import { routes } from './routes.ts'

/** Headers every response carries, public pages and the admin alike. */
const securityHeaders: Middleware = async (context, next) => {
  let response = await next()
  // Set only where a response has not chosen its own, so the admin's stricter values stand.
  let fallback = (name: string, value: string) => {
    if (!response.headers.has(name)) response.headers.set(name, value)
  }
  fallback('X-Content-Type-Options', 'nosniff')
  fallback('Referrer-Policy', 'strict-origin-when-cross-origin')
  fallback('X-Frame-Options', 'SAMEORIGIN')
  fallback('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  let https = new URL(context.request.url).protocol === 'https:' || context.request.headers.get('x-forwarded-proto') === 'https'
  if (https) response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  return response
}

export const router = createRouter({
  middleware: [securityHeaders, staticFiles('./public', { index: false }), render({ assets })],
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
