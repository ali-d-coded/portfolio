import type { Handle, RemixNode } from 'remix/component'

import { store } from '../data/store.ts'
import { routes } from '../routes.ts'
import { Layout, loadFrame, type Frame } from '../ui/layout.tsx'

export function NotFoundPage(handle: Handle<{ frame: Frame }>) {
  return () => {
    let { frame } = handle.props
    let name = frame.site?.name

    return (
      <Layout
        title={name ? `Page not found: ${name}` : 'Page not found'}
        description="The page at this address does not exist, or the project on it is hidden for now."
        pageType="not-found"
        frame={frame}
      >
        <section class="hero hero--statement" data-enter="" aria-labelledby="hero-h">
          <div class="wrap">
            <div class="hero-text hero__in">
              <div>
                <h1 id="hero-h" data-split="">
                  Page not found
                </h1>
                <p class="hero__lead">
                  The address may be out of date, or the project may be hidden for now.
                </p>
                <div class="btn-row">
                  {frame.projects.length > 0 ? (
                    <a
                      class="btn btn--secondary"
                      href={routes.work.index.href()}
                      data-cursor="link"
                    >
                      See the case studies
                    </a>
                  ) : (
                    <a
                      class="btn btn--secondary"
                      href={routes.home.href()}
                      data-cursor="link"
                    >
                      See the home page
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    )
  }
}

/** The router's answer to any URL no route matches: the same 404 page. */
export async function renderNotFound(context: {
  render(node: RemixNode, init?: ResponseInit): Response | Promise<Response>
}): Promise<Response> {
  let frame = await loadFrame(store)
  return context.render(<NotFoundPage frame={frame} />, { status: 404 })
}
