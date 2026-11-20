import { gsap } from 'gsap'

/**
 * The loading reveal for the first visit to the home page in a tab (the boot script in the document head
 * decides that and adds `intro` to the page). The desk "boots": a short log types out while a bar fills with a
 * paper plane riding its front, the bar waits for the fonts and the page to be ready, then the cover breaks
 * into pixels that shrink away from the middle, and the hero rises as they go.
 *
 * Resolves the moment the pixels start to clear, so the hero can start its own entrance then.
 */
export function playIntro(): Promise<void> {
  let root = document.documentElement
  let overlay = document.querySelector<HTMLElement>('[data-intro]')
  if (!overlay) {
    root.classList.remove('intro')
    return Promise.resolve()
  }
  let el = overlay
  let center = el.querySelector<HTMLElement>('[data-intro-center]')!
  let lines = [...el.querySelectorAll<HTMLElement>('.opening__line')]
  let fill = el.querySelector<HTMLElement>('[data-intro-fill]')!
  let count = el.querySelector<HTMLElement>('[data-intro-count]')!
  let plane = el.querySelector<HTMLElement>('[data-intro-plane]')!
  let pixels = el.querySelector<HTMLElement>('[data-intro-px]')!
  let bar = fill.parentElement!

  gsap.set(lines, { autoAlpha: 0, x: -10 })
  gsap.set(center, { autoAlpha: 0, y: 14 })

  let value = { v: 0 }
  let bob = 0
  function paint() {
    let ratio = value.v / 100
    gsap.set(fill, { scaleX: ratio })
    count.textContent = `${String(Math.round(value.v)).padStart(2, '0')}%`
    gsap.set(plane, { x: ratio * bar.offsetWidth, y: Math.sin(bob) * 2.5 })
  }
  let tick = () => {
    bob += 0.2
    paint()
  }
  gsap.ticker.add(tick)

  let to = (vars: gsap.TweenVars) =>
    new Promise<void>((resolve) => {
      gsap.to(value, { ...vars, onComplete: resolve })
    })
  let show = (index: number) => gsap.to(lines[index]!, { autoAlpha: 1, x: 0, duration: 0.3, ease: 'power2.out' })

  // Fonts and the page itself, but never for long: the intro must not hold the site up.
  let ready = Promise.race([
    Promise.all([
      document.fonts.ready,
      document.readyState === 'complete' ? Promise.resolve() : new Promise((resolve) => window.addEventListener('load', resolve, { once: true })),
    ]),
    new Promise((resolve) => window.setTimeout(resolve, 3200)),
  ])

  return new Promise<void>((revealStarted) => {
    void (async () => {
      await new Promise<void>((resolve) => gsap.to(center, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out', onComplete: resolve }))
      show(0)
      await to({ v: 34, duration: 0.55, ease: 'power2.out' })
      show(1)
      await to({ v: 66, duration: 0.5, ease: 'power1.inOut' })
      show(2)
      await to({ v: 90, duration: 0.5, ease: 'power1.inOut' })
      await ready
      await to({ v: 100, duration: 0.3, ease: 'power2.out' })
      show(3)
      await new Promise((resolve) => window.setTimeout(resolve, 350))

      // The reveal: a grid of pixels in the page colour takes over from the cover, then shrinks away from the middle.
      let width = window.innerWidth
      let height = window.innerHeight
      let size = Math.max(72, Math.round(width / 10))
      let cols = Math.ceil(width / size)
      let rows = Math.ceil(height / size)
      pixels.style.gridTemplateColumns = `repeat(${cols}, ${size}px)`
      pixels.style.gridTemplateRows = `repeat(${rows}, ${size}px)`
      let blocks: HTMLElement[] = []
      let delays: number[] = []
      let farthest = Math.hypot(width / 2, height / 2)
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          let block = document.createElement('i')
          let roll = Math.random()
          let colour = roll < 0.1 ? 'var(--amber)' : roll < 0.2 ? 'color-mix(in oklab, var(--ink) 14%, var(--bg))' : 'var(--bg)'
          block.style.background = colour
          block.style.boxShadow = `0 0 0 1px ${colour}`
          blocks.push(block)
          let distance = Math.hypot((col + 0.5) * size - width / 2, (row + 0.5) * size - height / 2)
          delays.push((distance / farthest) * 0.55 + Math.random() * 0.12)
        }
      }
      pixels.append(...blocks)
      gsap.set(blocks, { scale: 1.02 })
      // Now the pixels are the cover, so the plain one can go.
      el.classList.add('is-open')
      gsap.to(center, { autoAlpha: 0, scale: 0.96, duration: 0.3, ease: 'power2.in' })
      blocks.forEach((block, index) => {
        gsap.to(block, { scale: 0, duration: 0.4, ease: 'power2.in', delay: delays[index]! + 0.25 })
      })
      window.setTimeout(revealStarted, 250)

      await new Promise((resolve) => window.setTimeout(resolve, (Math.max(...delays) + 0.25 + 0.45) * 1000))
      gsap.ticker.remove(tick)
      root.classList.remove('intro')
      el.remove()
    })()
  })
}
