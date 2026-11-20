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
}

// Runs before the first paint: the saved or system theme, the `js` flag that arms the entrance styles, and
// the `arrive` flag a page transition leaves behind. After 2.5 seconds everything is shown whatever happens.
const BOOT_SCRIPT = `(function(){var d=document.documentElement;var t;try{t=localStorage.getItem('theme')}catch(e){}if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}d.dataset.theme=t;d.classList.add('js');try{if(sessionStorage.getItem('arrive')){d.classList.add('arrive')}}catch(e){}try{if(location.pathname==='/'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){var seen=sessionStorage.getItem('intro');sessionStorage.setItem('intro','1');if(!seen&&!sessionStorage.getItem('arrive')){d.classList.add('intro')}}}catch(e){}setTimeout(function(){d.classList.add('ready');d.classList.remove('arrive')},2500);setTimeout(function(){d.classList.remove('intro')},9000)})()`

const FONTS =
  'https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Courier+Prime:wght@400;700&family=Geist:wght@300..700&family=JetBrains+Mono:wght@400;500;600;700&display=swap'

export function Document(handle: Handle<DocumentProps>) {
  return () => {
    let { children, title, description, robots = 'index, follow' } = handle.props
    let { href, importMap, preloads } = scriptEntry

    return (
      <html lang="en" data-theme="dark">
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
          <meta name="twitter:card" content="summary" />
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <meta name="theme-color" content="#111113" />
          <script innerHTML={unsafeHTML(BOOT_SCRIPT)} />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="stylesheet" href={FONTS} />
          <link rel="stylesheet" href="/desk/desk.css" />
          <ImportMap value={importMap} />
          {preloads.map((preloadHref) => (
            <link key={preloadHref} rel="modulepreload" href={preloadHref} />
          ))}
          <script type="module" src={href}></script>
        </head>
        <body>{children}</body>
      </html>
    )
  }
}
