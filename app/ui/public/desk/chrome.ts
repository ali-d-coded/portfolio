import { gsap } from 'gsap'

/** The floating bits of chrome: the draggable theme note, the back-to-top button and the small-screen menu. */

/**
 * The theme note can be picked up and carried. It follows the pointer exactly, can never leave the screen,
 * and on release it springs to the nearer side edge, so it is always somewhere easy to find.
 * A drag never counts as a click.
 */
export function initDraggableToggle(reduced: boolean): void {
  let toggle = document.querySelector<HTMLElement>('[data-theme-toggle]')
  if (!toggle) return
  let node = toggle
  const MARGIN = 12
  gsap.set(node, { rotation: 2 })

  let down = false
  let moved = false
  let startPointer = { x: 0, y: 0 }
  let startOffset = { x: 0, y: 0 }

  node.addEventListener(
    'click',
    (event) => {
      if (!moved) return
      event.preventDefault()
      event.stopImmediatePropagation()
    },
    true,
  )

  /** The room the note has: below the header, and inside the screen on every other side. */
  function limits() {
    let header = document.querySelector<HTMLElement>('.top')?.getBoundingClientRect().bottom ?? 0
    return { top: header + MARGIN, bottom: window.innerHeight - MARGIN, left: MARGIN, right: window.innerWidth - MARGIN }
  }

  /** The offset that puts the note's box at the given viewport position. */
  function offsetFor(left: number, top: number) {
    let rect = node.getBoundingClientRect()
    return {
      x: Number(gsap.getProperty(node, 'x')) + (left - rect.left),
      y: Number(gsap.getProperty(node, 'y')) + (top - rect.top),
    }
  }

  node.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    down = true
    moved = false
    startPointer = { x: event.clientX, y: event.clientY }
    startOffset = { x: Number(gsap.getProperty(node, 'x')), y: Number(gsap.getProperty(node, 'y')) }
    gsap.killTweensOf(node, 'x,y')
    node.setPointerCapture(event.pointerId)
  })

  node.addEventListener('pointermove', (event) => {
    if (!down) return
    let dx = event.clientX - startPointer.x
    let dy = event.clientY - startPointer.y
    if (!moved && Math.hypot(dx, dy) < 6) return
    if (!moved) {
      moved = true
      node.classList.add('is-held')
      if (!reduced) gsap.to(node, { scale: 1.08, duration: 0.2 })
    }
    // Where the box would be, kept inside the screen, then turned back into an offset.
    let rect = node.getBoundingClientRect()
    let room = limits()
    let wantLeft = rect.left + (startOffset.x + dx - Number(gsap.getProperty(node, 'x')))
    let wantTop = rect.top + (startOffset.y + dy - Number(gsap.getProperty(node, 'y')))
    let left = gsap.utils.clamp(room.left, Math.max(room.left, room.right - rect.width), wantLeft)
    let top = gsap.utils.clamp(room.top, Math.max(room.top, room.bottom - rect.height), wantTop)
    let at = offsetFor(left, top)
    gsap.set(node, { x: at.x, y: at.y })
  })

  function release(event: PointerEvent) {
    if (!down) return
    down = false
    if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId)
    node.classList.remove('is-held')
    if (moved) {
      let rect = node.getBoundingClientRect()
      let room = limits()
      let toLeft = rect.left + rect.width / 2 < window.innerWidth / 2
      let left = toLeft ? room.left : room.right - rect.width
      let top = gsap.utils.clamp(room.top, Math.max(room.top, room.bottom - rect.height), rect.top)
      let at = offsetFor(left, top)
      gsap.to(node, { x: at.x, y: at.y, scale: 1, duration: reduced ? 0 : 0.7, ease: 'elastic.out(1, 0.6)' })
    }
    window.setTimeout(() => (moved = false), 60)
  }
  node.addEventListener('pointerup', release)
  node.addEventListener('pointercancel', release)

  // A resize can leave it outside the screen; bring it back to the nearest edge.
  window.addEventListener('resize', () => {
    let rect = node.getBoundingClientRect()
    let room = limits()
    let left = gsap.utils.clamp(room.left, Math.max(room.left, room.right - rect.width), rect.left)
    let top = gsap.utils.clamp(room.top, Math.max(room.top, room.bottom - rect.height), rect.top)
    let at = offsetFor(left, top)
    gsap.set(node, { x: at.x, y: at.y })
  })
}

/** The back-to-top button fades in once the page has been scrolled a screen or so. */
export function initScrollTop(reduced: boolean): void {
  let button = document.querySelector<HTMLElement>('[data-to-top]')
  if (!button) return
  let node = button
  let visible = false
  function update() {
    let show = window.scrollY > window.innerHeight * 0.8
    if (show === visible) return
    visible = show
    node.classList.toggle('is-on', show)
    node.tabIndex = show ? 0 : -1
  }
  node.tabIndex = -1
  window.addEventListener('scroll', update, { passive: true })
  update()
  node.addEventListener('click', () => {
    if (reduced) {
      window.scrollTo(0, 0)
      return
    }
    let state = { y: window.scrollY }
    gsap.to(state, {
      y: 0,
      duration: Math.min(1.2, 0.5 + window.scrollY / 4000),
      ease: 'power3.inOut',
      onUpdate: () => window.scrollTo(0, state.y),
    })
  })
}

/** The small-screen menu: a round button that blooms its links out of itself, and folds them back. */
export function initMenu(reduced: boolean): void {
  let root = document.querySelector<HTMLElement>('[data-menu]')
  let button = root?.querySelector<HTMLButtonElement>('[data-menu-button]')
  let items = root ? [...root.querySelectorAll<HTMLElement>('[data-menu-item]')] : []
  if (!root || !button || items.length === 0) return
  let menu = root
  let trigger = button

  // The links sit on a quarter circle around the button: from straight up round to straight left.
  let reach = 126
  let spots = items.map((_, index) => {
    let angle = items.length === 1 ? 135 : 90 + (index / (items.length - 1)) * 90
    let radians = (angle * Math.PI) / 180
    return { x: Math.cos(radians) * reach, y: -Math.sin(radians) * reach }
  })
  gsap.set(items, { autoAlpha: 0, scale: 0, x: 0, y: 0, transformOrigin: '50% 50%' })

  let open = false
  function set(next: boolean) {
    open = next
    menu.classList.toggle('is-open', open)
    trigger.setAttribute('aria-expanded', String(open))
    trigger.setAttribute('aria-label', open ? 'Close the menu' : 'Open the menu')
    for (let item of items) item.tabIndex = open ? 0 : -1
    gsap.killTweensOf(items)
    if (open) {
      gsap.to(items, {
        autoAlpha: 1,
        scale: 1,
        x: (index: number) => spots[index]!.x,
        y: (index: number) => spots[index]!.y,
        duration: reduced ? 0 : 0.55,
        ease: 'back.out(1.6)',
        stagger: reduced ? 0 : 0.07,
      })
    } else {
      gsap.to(items, {
        autoAlpha: 0,
        scale: 0,
        x: 0,
        y: 0,
        duration: reduced ? 0 : 0.3,
        ease: 'power2.in',
        stagger: reduced ? 0 : { each: 0.03, from: 'start' },
      })
    }
  }

  trigger.addEventListener('click', () => set(!open))
  document.addEventListener('pointerdown', (event) => {
    if (open && !menu.contains(event.target as Node)) set(false)
  })
  document.addEventListener('keydown', (event) => {
    if (open && event.key === 'Escape') {
      set(false)
      trigger.focus()
    }
  })
}
