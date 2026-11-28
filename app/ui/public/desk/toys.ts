import { gsap } from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * The doodles. The badge swings on its lanyard when the pointer brushes it or the page is scrolled fast.
 * The stickers, note, mug, gears and rocket can be picked up and thrown on a wide screen with a mouse;
 * the mug, gears and rocket also do something when pressed, on any screen. Scatter and Tidy move them all.
 */

const DRAG_QUERY = '(min-width: 900px) and (hover: hover) and (pointer: fine)'

function baseRotation(toy: HTMLElement): number {
  return Number.parseFloat(toy.dataset.rot ?? '0') || 0
}

export function initToys(reduced: boolean): void {
  let desk = document.querySelector<HTMLElement>('[data-desk]')
  if (!desk) return
  let toys = [...desk.querySelectorAll<HTMLElement>('[data-toy]')]
  // The dock is fixed to the viewport; lift it out so no animated ancestor can displace it.
  let dock = desk.querySelector<HTMLElement>('.desk__tools')
  if (dock) document.body.append(dock)

  // GSAP takes over each toy's transform from here, starting from its resting tilt.
  for (let toy of toys) gsap.set(toy, { rotation: baseRotation(toy) })

  let held = false
  let suppressClick = false
  // A drag must not count as a click: a sticker is a link, and the mug and rocket are buttons.
  for (let toy of toys) {
    toy.addEventListener(
      'click',
      (event) => {
        if (!suppressClick) return
        event.preventDefault()
        event.stopImmediatePropagation()
      },
      true,
    )
  }

  let badge = toys.find((toy) => toy.dataset.toy === 'badge')
  if (badge && !reduced) initBadge(badge)

  for (let toy of toys.filter((item) => item.dataset.toy === 'sticker')) initSticker(toy, reduced)
  let mug = toys.find((toy) => toy.dataset.toy === 'mug')
  if (mug) initMug(mug, reduced)
  let gears = toys.find((toy) => toy.dataset.toy === 'gears')
  if (gears) initGears(gears, reduced)
  let rocket = toys.find((toy) => toy.dataset.toy === 'rocket')
  if (rocket) initRocket(rocket, reduced)

  // Dragging: only where a mouse and room make it pleasant.
  let draggable = toys.filter((toy) => toy.dataset.toy !== 'badge')
  let bounds = desk.closest<HTMLElement>('.hero') ?? desk
  let media = gsap.matchMedia()
  media.add(DRAG_QUERY, () => {
    let instances = Draggable.create(draggable, {
      type: 'x,y',
      bounds,
      dragClickables: true,
      minimumMovement: 5,
      onPress(this: Draggable) {
        held = true
        suppressClick = false
        let toy = this.target as HTMLElement
        toy.classList.add('is-held')
        if (!reduced) gsap.to(toy, { scale: 1.06, duration: 0.2, overwrite: 'auto' })
      },
      onDragStart() {
        suppressClick = true
      },
      onDrag(this: Draggable) {
        if (reduced) return
        let toy = this.target as HTMLElement
        let lean = gsap.utils.clamp(-14, 14, InertiaPlugin.getVelocity(toy, 'x') / 90)
        gsap.to(toy, { rotation: baseRotation(toy) + lean, duration: 0.25, overwrite: 'auto' })
      },
      onRelease(this: Draggable) {
        held = false
        let toy = this.target as HTMLElement
        toy.classList.remove('is-held')
        if (!reduced) {
          // A short, bounded throw: the toy carries on a little in the direction it was moving.
          let vx = gsap.utils.clamp(-100, 100, InertiaPlugin.getVelocity(toy, 'x') * 0.12)
          let vy = gsap.utils.clamp(-100, 100, InertiaPlugin.getVelocity(toy, 'y') * 0.12)
          let [x, y] = within(toy, Number(gsap.getProperty(toy, 'x')) + vx, Number(gsap.getProperty(toy, 'y')) + vy)
          gsap.to(toy, { x, y, duration: 0.6, ease: 'power3.out', onComplete: () => Draggable.get(toy)?.update() })
          gsap.to(toy, { scale: 1, rotation: baseRotation(toy), duration: 0.9, ease: 'elastic.out(1, 0.45)', overwrite: 'auto' })
        } else {
          gsap.set(toy, { scale: 1, rotation: baseRotation(toy) })
        }
        // The click that follows a drag arrives a moment after release; let it through again after that.
        window.setTimeout(() => {
          suppressClick = false
        }, 60)
      },
    })
    InertiaPlugin.track(draggable, 'x,y')
    return () => {
      for (let instance of instances) instance.kill()
    }
  })

  /** A target offset for a toy, pulled back inside the hero so it can never be thrown off the desk. */
  function within(toy: HTMLElement, x: number, y: number): [number, number] {
    let box = bounds.getBoundingClientRect()
    let rect = toy.getBoundingClientRect()
    let cx = Number(gsap.getProperty(toy, 'x'))
    let cy = Number(gsap.getProperty(toy, 'y'))
    return [
      gsap.utils.clamp(box.left - rect.left + cx, box.right - rect.right + cx, x),
      gsap.utils.clamp(box.top - rect.top + cy, box.bottom - rect.bottom + cy, y),
    ]
  }

  function refresh(toy: HTMLElement) {
    Draggable.get(toy)?.update()
  }

  dock?.querySelector('[data-desk-scatter]')?.addEventListener('click', () => {
    if (held) return
    for (let toy of draggable) {
      let x = Number(gsap.getProperty(toy, 'x'))
      let y = Number(gsap.getProperty(toy, 'y'))
      let [nx, ny] = within(toy, x + gsap.utils.random(-280, 280), y + gsap.utils.random(-240, 240))
      gsap.to(toy, {
        x: nx,
        y: ny,
        rotation: gsap.utils.random(-18, 18),
        duration: reduced ? 0 : 0.9,
        ease: 'back.out(1.4)',
        onComplete: () => refresh(toy),
      })
    }
  })

  dock?.querySelector('[data-desk-tidy]')?.addEventListener('click', () => {
    for (let toy of draggable) {
      gsap.to(toy, {
        x: 0,
        y: 0,
        scale: 1,
        rotation: baseRotation(toy),
        duration: reduced ? 0 : 0.8,
        ease: 'power3.inOut',
        onComplete: () => refresh(toy),
      })
    }
  })

  // The toys drop onto the desk, one after another.
  if (!reduced) {
    gsap.set(toys, { opacity: 0, y: (index: number) => -60 - index * 8 })
  }
}

/** Called once the page is visible: the toys drop in. Returns nothing; harmless when there are none. */
export function dropToys(): void {
  let toys = [...document.querySelectorAll<HTMLElement>('[data-desk] [data-toy]')]
  if (toys.length === 0) return
  gsap.to(toys, {
    opacity: 1,
    y: 0,
    duration: 1,
    ease: 'bounce.out',
    stagger: 0.08,
    delay: 0.35,
    clearProps: 'opacity',
    onComplete: () => {
      for (let toy of toys) Draggable.get(toy)?.update()
    },
  })
}

function initBadge(badge: HTMLElement) {
  let base = baseRotation(badge)
  gsap.set(badge, { transformOrigin: '50% -60px' })
  let current: gsap.core.Tween | gsap.core.Timeline | undefined
  let pressed = false

  // Every move starts from where the badge is now, so nothing ever jumps.
  let go = (to: number, vars: gsap.TweenVars) => {
    current?.kill()
    current = gsap.to(badge, { rotation: to, overwrite: true, ...vars })
  }
  let swing = (power: number) => {
    current?.kill()
    current = gsap
      .timeline()
      .to(badge, { rotation: base + power, duration: 0.25, ease: 'power2.out' })
      .to(badge, { rotation: base, duration: 2.4, ease: 'elastic.out(1, 0.25)' })
  }
  let atRest = () =>
    Math.abs(Number(gsap.getProperty(badge, 'rotation')) - base) < 1.5 &&
    Math.hypot(Number(gsap.getProperty(badge, 'x')), Number(gsap.getProperty(badge, 'y'))) < 2

  let lastX = 0
  badge.addEventListener('pointerenter', (event) => {
    if (pressed || event.pointerType === 'touch' || !atRest()) return
    swing(event.clientX >= lastX ? 5 : -5)
  })
  badge.addEventListener('pointermove', (event) => {
    lastX = event.clientX
  })

  // Press and pull: the card follows the pointer as far as you like, the strap stretches to keep hold of it,
  // and on release everything springs back. The strap is a child of the card, so it is placed in the card's
  // own (rotated) frame: it runs from the fixed anchor above to the card's top edge.
  let strap = badge.querySelector<HTMLElement>('.badge__strap')
  let strapLength = 64
  if (strap) gsap.set(strap, { transformOrigin: '50% 0%' })
  let place = () => {
    if (!strap) return
    let x = Number(gsap.getProperty(badge, 'x'))
    let y = Number(gsap.getProperty(badge, 'y'))
    let r = (Number(gsap.getProperty(badge, 'rotation')) * Math.PI) / 180
    let lx = x * Math.cos(r) + y * Math.sin(r)
    let ly = -x * Math.sin(r) + y * Math.cos(r)
    let length = Math.hypot(lx, strapLength + ly)
    gsap.set(strap, {
      x: -lx,
      y: -ly,
      rotation: (Math.atan2(-lx, strapLength + ly) * 180) / Math.PI,
      scaleY: length / strapLength,
      scaleX: gsap.utils.clamp(0.35, 1, Math.sqrt(strapLength / length)),
    })
  }
  gsap.ticker.add(place)

  let originX = 0
  let originY = 0
  let moved = false
  badge.addEventListener('pointerdown', (event) => {
    pressed = true
    moved = false
    current?.kill()
    originX = event.clientX - Number(gsap.getProperty(badge, 'x'))
    originY = event.clientY - Number(gsap.getProperty(badge, 'y'))
    badge.classList.add('is-held')
    badge.setPointerCapture(event.pointerId)
  })
  badge.addEventListener('pointermove', (event) => {
    if (!pressed) return
    let x = event.clientX - originX
    let y = event.clientY - originY
    if (Math.hypot(x, y) > 3) moved = true
    // Hanging from above, a pull to the right swings the card's bottom to the right: a negative turn about the anchor.
    gsap.set(badge, { x, y, rotation: base - gsap.utils.clamp(-25, 25, x / 12) })
  })
  let release = (event: PointerEvent) => {
    if (!pressed) return
    pressed = false
    badge.classList.remove('is-held')
    if (badge.hasPointerCapture(event.pointerId)) badge.releasePointerCapture(event.pointerId)
    if (moved) {
      current?.kill()
      current = gsap.to(badge, { x: 0, y: 0, rotation: base, duration: 1.8, ease: 'elastic.out(1, 0.28)', overwrite: true })
    } else {
      let box = badge.getBoundingClientRect()
      swing(event.clientX < box.left + box.width / 2 ? 7 : -7)
    }
  }
  badge.addEventListener('pointerup', release)
  badge.addEventListener('pointercancel', release)

  // A fast scroll sets it swaying; when the page settles it swings back.
  let settle = 0
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      if (pressed) return
      let lean = gsap.utils.clamp(-9, 9, self.getVelocity() / -260)
      if (Math.abs(lean) < 1) return
      go(base + lean, { duration: 0.4, ease: 'power3.out' })
      window.clearTimeout(settle)
      settle = window.setTimeout(() => swing(lean * 0.6), 140)
    },
  })
}

function initSticker(sticker: HTMLElement, reduced: boolean) {
  if (reduced) return
  let base = baseRotation(sticker)
  sticker.addEventListener('pointerenter', () => {
    if (sticker.classList.contains('is-held')) return
    gsap.to(sticker, { rotation: base + gsap.utils.random(-7, 7), scale: 1.07, duration: 0.3, ease: 'back.out(2)', overwrite: 'auto' })
  })
  sticker.addEventListener('pointerleave', () => {
    if (sticker.classList.contains('is-held')) return
    gsap.to(sticker, { rotation: base, scale: 1, duration: 0.5, ease: 'power3.out', overwrite: 'auto' })
  })
}

function initMug(mug: HTMLElement, reduced: boolean) {
  let caption = mug.querySelector<HTMLElement>('[data-mug-cap]')
  let steamA = mug.querySelector('.steam--a')
  let steamB = mug.querySelector('.steam--b')
  if (!reduced && steamA && steamB) {
    gsap.to([steamA, steamB], { strokeDashoffset: -20, duration: 2.2, ease: 'none', repeat: -1 })
    gsap.to(steamA, { y: -3, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 })
    gsap.to(steamB, { y: -5, duration: 2.1, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.4 })
  }
  let refills = 0
  let reset = 0
  mug.addEventListener('click', () => {
    refills += 1
    if (caption) caption.textContent = refills > 3 ? 'enough now' : 'refilled'
    window.clearTimeout(reset)
    reset = window.setTimeout(() => {
      if (caption) caption.textContent = 'coffee & queues'
    }, 1800)
    if (reduced) return
    let base = baseRotation(mug)
    gsap.fromTo(
      mug,
      { rotation: base - 8 },
      { rotation: base, duration: 1.1, ease: 'elastic.out(1, 0.3)', overwrite: 'auto' },
    )
    if (steamA && steamB) {
      gsap.fromTo([steamA, steamB], { scaleY: 1.9, opacity: 1 }, { scaleY: 1, opacity: 1, duration: 1.2, ease: 'power3.out', transformOrigin: '50% 100%' })
    }
  })
}

function initGears(gears: HTMLElement, reduced: boolean) {
  let big = gears.querySelector('.gear--a')
  let small = gears.querySelector('.gear--b')
  if (!big || !small) return
  if (reduced) {
    gears.addEventListener('click', () => {
      gsap.set(big, { rotation: '+=45', svgOrigin: '40 40' })
      gsap.set(small, { rotation: '-=60', svgOrigin: '66 66' })
    })
    return
  }
  let spinBig = gsap.to(big, { rotation: 360, svgOrigin: '40 40', duration: 22, ease: 'none', repeat: -1 })
  let spinSmall = gsap.to(small, { rotation: -360, svgOrigin: '66 66', duration: 12, ease: 'none', repeat: -1 })
  // Scrolling turns them too.
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      let push = gsap.utils.clamp(-8, 8, self.getVelocity() / 400)
      gsap.to([spinBig, spinSmall], { timeScale: 1 + Math.abs(push), duration: 0.2, overwrite: true })
      gsap.to([spinBig, spinSmall], { timeScale: 1, duration: 1.5, delay: 0.2 })
    },
  })
  gears.addEventListener('click', () => {
    gsap.fromTo([spinBig, spinSmall], { timeScale: 14 }, { timeScale: 1, duration: 2.4, ease: 'power3.out', overwrite: true })
  })
}

function initRocket(rocket: HTMLElement, reduced: boolean) {
  let flame = rocket.querySelector('.flame')
  let flying = false
  rocket.addEventListener('click', () => {
    if (flying) return
    if (reduced) {
      let caption = rocket.querySelector<HTMLElement>('.toy__cap')
      if (caption) {
        caption.textContent = 'shipped'
        window.setTimeout(() => (caption.textContent = 'ship it'), 1500)
      }
      return
    }
    flying = true
    let y0 = Number(gsap.getProperty(rocket, 'y'))
    let rect = rocket.getBoundingClientRect()
    let base = baseRotation(rocket)
    rocket.style.pointerEvents = 'none'
    let tl = gsap.timeline({
      onComplete: () => {
        flying = false
        rocket.style.pointerEvents = ''
        Draggable.get(rocket)?.update()
      },
    })
    if (flame) {
      tl.to(flame, { opacity: 1, scaleY: 1.6, duration: 0.15, yoyo: true, repeat: 5, transformOrigin: '50% 0%' }, 0)
    }
    tl.to(rocket, { rotation: base - 4, duration: 0.12, yoyo: true, repeat: 3, ease: 'none' }, 0)
      .to(rocket, { y: y0 - (rect.bottom + 80), rotation: 0, duration: 1, ease: 'power3.in' }, 0.35)
      .set(rocket, { y: y0 + (window.innerHeight - rect.top + 80) })
      .to(rocket, { y: y0, rotation: base, duration: 1.1, ease: 'back.out(1.3)' })
    if (flame) tl.to(flame, { opacity: 0, duration: 0.3 }, '<0.2')
  })
}
