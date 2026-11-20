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
        <section class="hero hero--page" aria-labelledby="hero-h" data-ruler-section="Intro">
          <div class="wrap hero__stack">
            <p class="term" data-enter="">
              <span aria-hidden="true">&gt;</span> 404
            </p>
            <h1 id="hero-h" class="hero__title" data-split="" data-hero="">
              Page not found
            </h1>
            <p class="lead" data-enter="">
              The address may be out of date, or the project may be hidden for now.
            </p>
            <div class="btns" data-enter="">
              {frame.projects.length > 0 ? (
                <a class="btn btn--ghost" href={routes.work.index.href()} data-cursor="link">
                  See the projects
                </a>
              ) : (
                <a class="btn btn--ghost" href={routes.home.href()} data-cursor="link">
                  See the home page
                </a>
              )}
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
