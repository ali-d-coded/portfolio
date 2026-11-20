import { gsap } from 'gsap'

/**
 * Page transitions on plain document navigations: a curtain wipes up over the page, the browser loads the
 * next one, and the curtain (kept by a flag in sessionStorage, read by the inline script in the head)
 * wipes away. No client router is involved, so every page is a normal, complete HTML page.
 */
export function initTransitions(): void {
  let curtain = document.querySelector<HTMLElement>('.curtain')
  if (!curtain) return
  let root = document.documentElement

  // Arrival: the page loaded behind the curtain; lift it.
  let arrived = root.classList.contains('arrive')
  try {
    sessionStorage.removeItem('arrive')
  } catch {
    // Storage can be refused; the curtain then simply does not play.
  }
  if (arrived) {
    gsap.set(curtain, { visibility: 'visible', clipPath: 'inset(0% 0% 0% 0%)' })
    gsap.to(curtain, {
      clipPath: 'inset(0% 0% 100% 0%)',
      duration: 0.75,
      ease: 'power4.inOut',
      delay: 0.1,
      onComplete: () => {
        gsap.set(curtain, { visibility: 'hidden', clipPath: 'inset(100% 0% 0% 0%)' })
        root.classList.remove('arrive')
      },
    })
  }

  // Coming back from the browser's cache: never leave the curtain over the page.
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return
    gsap.killTweensOf(curtain)
    gsap.set(curtain, { visibility: 'hidden', clipPath: 'inset(100% 0% 0% 0%)' })
    root.classList.remove('arrive')
  })

  let leaving = false
  document.addEventListener('click', (event) => {
    if (leaving || event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    let link = (event.target as Element).closest('a')
    if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return
    let url = new URL(link.href, location.href)
    if (url.origin !== location.origin) return
    // Same page (a hash jump): let the browser or the smooth scroller handle it.
    if (url.pathname === location.pathname && url.search === location.search) return

    event.preventDefault()
    leaving = true
    let go = () => {
      try {
        sessionStorage.setItem('arrive', '1')
      } catch {
        // Without storage the next page just loads without the curtain.
      }
      location.href = url.href
    }
    // A failsafe, so a stalled animation can never trap the visitor on this page.
    let failsafe = window.setTimeout(go, 1100)
    gsap.set(curtain, { visibility: 'visible', clipPath: 'inset(100% 0% 0% 0%)' })
    gsap.to(curtain, {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: 0.55,
      ease: 'power3.inOut',
      onComplete: () => {
        window.clearTimeout(failsafe)
        go()
      },
    })
  })
}
