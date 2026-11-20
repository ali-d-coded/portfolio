import { gsap } from 'gsap'

/** The custom cursor: a ring and a dot that follow the mouse, and grow or take a label over things. */
export function initCursor(): void {
  let root = document.querySelector<HTMLElement>('.cursor')
  let ring = root?.querySelector<HTMLElement>('.cursor__ring')
  let dot = root?.querySelector<HTMLElement>('.cursor__dot')
  let label = root?.querySelector<HTMLElement>('.cursor__label')
  if (!root || !ring || !dot || !label) return

  gsap.set([ring, dot, label], { x: -100, y: -100 })
  let ringX = gsap.quickTo(ring, 'x', { duration: 0.4, ease: 'power3' })
  let ringY = gsap.quickTo(ring, 'y', { duration: 0.4, ease: 'power3' })
  let dotX = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'none' })
  let dotY = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'none' })
  let labelX = gsap.quickTo(label, 'x', { duration: 0.4, ease: 'power3' })
  let labelY = gsap.quickTo(label, 'y', { duration: 0.4, ease: 'power3' })
  let active = false

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return
    if (!active) {
      active = true
      document.documentElement.classList.add('has-cursor')
    }
    ringX(event.clientX)
    ringY(event.clientY)
    dotX(event.clientX)
    dotY(event.clientY)
    labelX(event.clientX)
    labelY(event.clientY)
  })

  let words: Record<string, string> = { view: 'View', drag: 'Drag' }
  document.addEventListener('pointerover', (event) => {
    let target = (event.target as Element).closest<HTMLElement>('[data-cursor]')
    let kind = target?.dataset.cursor ?? ''
    root.classList.toggle('is-link', kind === 'link')
    let word = words[kind]
    root.classList.toggle('is-label', Boolean(word))
    if (word) label.textContent = word
  })
  document.addEventListener('pointerdown', () => ring.animate([{ scale: 1 }, { scale: 0.8 }, { scale: 1 }], { duration: 260 }))
  document.documentElement.addEventListener('pointerleave', () => gsap.to(root, { opacity: 0, duration: 0.2 }))
  document.documentElement.addEventListener('pointerenter', () => gsap.to(root, { opacity: 1, duration: 0.2 }))
}

/** Buttons marked `data-magnetic` lean toward the pointer and spring back. */
export function initMagnetic(): void {
  for (let element of document.querySelectorAll<HTMLElement>('[data-magnetic]')) {
    let toX = gsap.quickTo(element, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' })
    let toY = gsap.quickTo(element, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' })
    element.addEventListener('pointermove', (event) => {
      let box = element.getBoundingClientRect()
      toX((event.clientX - (box.left + box.width / 2)) * 0.28)
      toY((event.clientY - (box.top + box.height / 2)) * 0.34)
    })
    element.addEventListener('pointerleave', () => {
      toX(0)
      toY(0)
    })
  }
}

/** On the Work page, a card with the stack follows the pointer over each project row. */
export function initPreview(): void {
  let rows = [...document.querySelectorAll<HTMLElement>('[data-project-list] [data-preview]')]
  if (rows.length === 0) return

  let box = document.createElement('div')
  box.className = 'preview'
  box.setAttribute('aria-hidden', 'true')
  let title = document.createElement('p')
  title.className = 'preview__title'
  let tag = document.createElement('p')
  tag.className = 'preview__tag'
  let tiles = document.createElement('div')
  tiles.className = 'preview__tiles'
  box.append(title, tag, tiles)
  document.body.append(box)

  let toX = gsap.quickTo(box, 'x', { duration: 0.45, ease: 'power3' })
  let toY = gsap.quickTo(box, 'y', { duration: 0.45, ease: 'power3' })
  gsap.set(box, { scale: 0.9, transformOrigin: '0 0' })

  for (let row of rows) {
    row.addEventListener('pointerenter', () => {
      title.textContent = row.querySelector('.prow__title')?.textContent ?? ''
      tag.textContent = row.querySelector('.prow__tagline')?.textContent ?? ''
      tiles.replaceChildren(...[...row.querySelectorAll('[data-preview-tools] .tile')].map((tile) => tile.cloneNode(true)))
      gsap.to(box, { opacity: 1, scale: 1, duration: 0.25, ease: 'power3.out' })
    })
    row.addEventListener('pointermove', (event) => {
      let width = box.offsetWidth
      let x = event.clientX + 24
      if (x + width > window.innerWidth - 12) x = event.clientX - width - 24
      toX(x)
      toY(event.clientY + 20)
    })
    row.addEventListener('pointerleave', () => gsap.to(box, { opacity: 0, scale: 0.9, duration: 0.2 }))
  }
}
