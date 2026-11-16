import type { Handle, RemixNode } from 'remix/component'
import { unsafeHTML } from 'remix/component'
import { ImportMap } from 'remix/component/server'

import { scriptEntry } from '../assets.ts'

export interface DocumentProps {
  children?: RemixNode
  title: string
  description: string
  /** `index, follow` on public pages, `noindex` where a page must stay out of search. */
  robots?: string
  /** The taste kit moment this page carries (assets/moments/<id>), preloaded in the head. */
  moment?: string
  /** Page CSS: only what sits inside a visual and the kit lacks. */
  pageCss?: string
}

// The dealt look (docs/superpowers/plans/copy.md, line 2): kept exactly as start.mjs printed it.
const ROOT_TOKENS = `:root {
  --p-bg: #eef0f3; --p-surface: #e2e5ea; --p-ink: #0b0c0e; --p-muted: #5d6470;
  --p-accent: #1f2de6; --p-accent-ink: #ffffff; --p-action: #1f2de6; --p-action-ink: #ffffff;
  --p-inv-bg: #0b0c0e; --p-inv-surface: #17181a; --p-inv-ink: #eef0f3; --p-inv-muted: #8e8f92;
  --p-inv-accent: #eef0f3; --p-inv-accent-ink: #0b0c0e; --p-inv-action: #eef0f3; --p-inv-action-ink: #0b0c0e;
  --font-display: "Funnel Display", system-ui, sans-serif;
  --font-text: "Funnel Sans", system-ui, sans-serif;
  --font-mono: "DM Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  --display-weight: 400;
  --display-tracking: -0.03em;
  --display-tracking-xl: -0.04em;
  --ly-scale: 0.98;
}`

// The hero's entrance (motion.md): the words wait for motion.js instead of flashing.
const ENTER_SCRIPT =
  "document.documentElement.classList.add('m-enter');setTimeout(()=>document.documentElement.classList.add('m-enter-done'),700)"

// The moments guard (moments.md): set before the first paint.
const MOMENT_SCRIPT =
  "document.documentElement.classList.add('mo-js');setTimeout(()=>document.documentElement.classList.add('mo-safe'),2500)"

const FONTS =
  'https://fonts.googleapis.com/css2?family=Funnel+Display:wght@400..700&family=Funnel+Sans:wght@400..600&family=DM+Mono:wght@400;500&display=swap'

export function Document(handle: Handle<DocumentProps>) {
  return () => {
    let { children, title, description, robots = 'index, follow', moment, pageCss } = handle.props
    let { href, importMap, preloads } = scriptEntry

    return (
      <html
        lang="en"
        data-type="software"
        data-radius="soft"
        data-ground="sand"
        data-buttons="pill"
        data-motion=""
      >
        <head>
          <meta charSet="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, viewport-fit=cover"
          />
          <title>{title}</title>
          <meta name="description" content={description} />
          <meta name="robots" content={robots} />
          <meta property="og:type" content="website" />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={description} />
          <meta name="twitter:card" content="summary_large_image" />
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <meta name="theme-color" content="#eef0f3" />
          <meta name="site-kind" content="software" />
          <meta name="page-type" content="software" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="stylesheet" href={FONTS} />
          <link rel="stylesheet" href="/assets/system.css" />
          <link rel="stylesheet" href="/assets/ui/cards.css" />
          <link rel="stylesheet" href="/assets/motion/motion.css" />
          <link rel="stylesheet" href="/assets/backgrounds/backgrounds.css" />
          <link rel="stylesheet" href="/assets/layout/layout.css" />
          <link rel="stylesheet" href="/assets/icons/icon.css" />
          <style innerHTML={unsafeHTML(ROOT_TOKENS)} />
          {pageCss ? <style innerHTML={unsafeHTML(pageCss)} /> : null}
          <script innerHTML={unsafeHTML(ENTER_SCRIPT)} />
          <script src="/assets/backgrounds/backgrounds.js"></script>
          {moment ? <script innerHTML={unsafeHTML(MOMENT_SCRIPT)} /> : null}
          {moment ? <link rel="modulepreload" href="/assets/moments/moments.js" /> : null}
          {moment ? <link rel="modulepreload" href="/assets/moments/lib.js" /> : null}
          {moment ? <link rel="modulepreload" href={`/assets/moments/${moment}/moment.js`} /> : null}
          <ImportMap value={importMap} />
          {preloads.map((preloadHref) => (
            <link key={preloadHref} rel="modulepreload" href={preloadHref} />
          ))}
          <script type="module" src={href}></script>
        </head>
        <body>
          {children}
          <script type="module" src="/assets/system.js"></script>
          <script type="module" src="/assets/motion/motion.js"></script>
          <script type="module" src="/assets/layout/layout.js"></script>
        </body>
      </html>
    )
  }
}
