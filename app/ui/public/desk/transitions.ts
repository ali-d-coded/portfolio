import { gsap } from 'gsap'

/**
 * Page transitions on plain document navigations: big square pixels pop in over the page in a random
 * stagger, the browser loads the next one, and (kept by a flag in sessionStorage, read by the inline script
 * in the head) the pixels pop away again. No client router is involved, so every page is a normal, complete
 * HTML page.
 */
export function initTransitions(): void {
  let curtain = document.querySelector<HTMLElement>('.curtain')
  if (!curtain) return
  let veil = curtain
  let root = document.documentElement

  /** Fill the curtain with a grid of big square blocks covering the viewport; some are yellow or white. */
  function build(): { blocks: HTMLElement[]; coloured: [HTMLElement, string][]; plain: string } {
    let size = Math.max(80, Math.round(window.innerWidth / 12))
    let cols = Math.ceil(window.innerWidth / size)
    let rows = Math.ceil(window.innerHeight / size)
    veil.replaceChildren()
    veil.style.gridTemplateColumns = `repeat(${cols}, ${size}px)`
    veil.style.gridTemplateRows = `repeat(${rows}, ${size}px)`
    let blocks: HTMLElement[] = []
    for (let index = 0; index < cols * rows; index++) {
      let block = document.createElement('i')
      let roll = Math.random()
      block.className = roll < 0.16 ? 'curtain__px curtain__px--yellow' : roll < 0.3 ? 'curtain__px curtain__px--white' : 'curtain__px'
      blocks.push(block)
    }
    veil.append(...blocks)
    let plain = getComputedStyle(blocks.find((block) => block.className === 'curtain__px')!).backgroundColor
    // The colour of each yellow and white block is read from the stylesheet, then pinned inline so it can be tweened.
    let coloured: [HTMLElement, string][] = blocks
      .filter((block) => block.className !== 'curtain__px')
      .map((block) => [block, getComputedStyle(block).backgroundColor])
    return { blocks, coloured, plain }
  }

  function clear() {
    gsap.killTweensOf(veil.children)
    veil.replaceChildren()
    veil.classList.remove('is-px')
    gsap.set(veil, { visibility: 'hidden' })
    root.classList.remove('arrive')
  }

  // Arrival: the page loaded behind a plain cover; swap it for the pixels and pop them away.
  let arrived = root.classList.contains('arrive')
  try {
    sessionStorage.removeItem('arrive')
  } catch {
    // Storage can be refused; the pixels then simply do not play.
  }
  if (arrived) {
    let { blocks, coloured, plain } = build()
    gsap.set(veil, { visibility: 'visible' })
    veil.classList.add('is-px')
    // The page arrives behind a plain cover, so every block starts plain and takes its colour just before it shrinks away.
    for (let [block] of coloured) gsap.set(block, { backgroundColor: plain, boxShadow: `0 0 0 1px ${plain}` })
    let colours = new Map(coloured)
    // Let the page's own start-up work settle for a couple of frames, so the pixels never stutter.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        let tl = gsap.timeline({ delay: 0.08, onComplete: clear })
        for (let block of blocks) {
          let at = Math.random() * 0.6
          let colour = colours.get(block)
          if (colour) tl.to(block, { backgroundColor: colour, boxShadow: `0 0 0 1px ${colour}`, duration: 0.14, ease: 'none' }, at)
          tl.to(block, { scale: 0, duration: 0.45, ease: 'power2.inOut' }, at + (colour ? 0.14 : 0))
        }
      }),
    )
  }

  // Coming back from the browser's cache: never leave the pixels over the page.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) clear()
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
    let failsafe = window.setTimeout(go, 1600)
    let { blocks, coloured, plain } = build()
    gsap.set(veil, { visibility: 'visible' })
    veil.classList.add('is-px')
    let tl = gsap.timeline({
      onComplete: () => {
        window.clearTimeout(failsafe)
        go()
      },
    })
    for (let block of blocks) tl.fromTo(block, { scale: 0 }, { scale: 1.02, duration: 0.4, ease: 'power2.inOut' }, Math.random() * 0.55)
    // Once the page is covered the colours settle to plain, so the next page's plain cover joins seamlessly.
    tl.to(coloured.map(([block]) => block), { backgroundColor: plain, boxShadow: `0 0 0 1px ${plain}`, duration: 0.2, ease: 'none' })
  })
}
