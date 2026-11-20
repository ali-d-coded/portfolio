import { gsap } from 'gsap'

/**
 * The custom cursor: a doodled paper plane, drawn like the other things on the desk. Its nose is the pointer.
 * It banks to face the way the mouse is moving and levels out when the mouse stops, leans in over links, and
 * gets a small label over things you can view or drag.
 */
export function initCursor(): void {
  let root = document.querySelector<HTMLElement>('.cursor')
  let plane = root?.querySelector<HTMLElement>('.cursor__plane')
  let label = root?.querySelector<HTMLElement>('.cursor__label')
  if (!root || !plane || !label) return

  // The plane turns about its nose, so the nose stays exactly on the pointer.
  gsap.set(plane, { x: -100, y: -100, transformOrigin: '6% 6%' })
  gsap.set(label, { x: -100, y: -100 })
  let planeX = gsap.quickTo(plane, 'x', { duration: 0.12, ease: 'power3' })
  let planeY = gsap.quickTo(plane, 'y', { duration: 0.12, ease: 'power3' })
  let turn = gsap.quickTo(plane, 'rotation', { duration: 0.35, ease: 'power3' })
  let labelX = gsap.quickTo(label, 'x', { duration: 0.4, ease: 'power3' })
  let labelY = gsap.quickTo(label, 'y', { duration: 0.4, ease: 'power3' })
  let active = false

  // At rest the nose points up and to the left, like an ordinary cursor.
  const REST = -135
  let lastX = 0
  let lastY = 0
  let rotation = 0
  let settle = 0

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return
    if (!active) {
      active = true
      lastX = event.clientX
      lastY = event.clientY
      document.documentElement.classList.add('has-cursor')
    }
    planeX(event.clientX)
    planeY(event.clientY)
    labelX(event.clientX)
    labelY(event.clientY)

    let dx = event.clientX - lastX
    let dy = event.clientY - lastY
    lastX = event.clientX
    lastY = event.clientY
    if (Math.hypot(dx, dy) > 4) {
      // Face the way it is travelling, by the shortest way round.
      let heading = (Math.atan2(dy, dx) * 180) / Math.PI - REST
      rotation += ((((heading - rotation) % 360) + 540) % 360) - 180
      turn(rotation)
      root.classList.add('is-moving')
      window.clearTimeout(settle)
      settle = window.setTimeout(() => {
        // Level out to the nearest resting angle.
        rotation = Math.round(rotation / 360) * 360
        turn(rotation)
        root.classList.remove('is-moving')
      }, 140)
    }
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
  // Scale through GSAP, not CSS `scale`: the plane is placed by a translate, and a CSS scale would shrink that offset too.
  document.addEventListener('pointerdown', () => {
    gsap.fromTo(plane, { scale: 1 }, { scale: 0.8, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 })
  })
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
