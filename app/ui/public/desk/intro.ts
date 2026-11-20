import { gsap } from 'gsap'

import { spline, type Point } from './curve.ts'

/**
 * The loading reveal for the first visit to the home page in a tab (the boot script in the document head decides
 * that and adds `intro` to the page): a rocket launch, about five and a half seconds long.
 *
 * The desk counts down from five on the launch pad while a short checklist ticks off. At zero the rocket lights,
 * lifts off and flies a loop around the whole window, trailing fire, while the cover breaks into pixels from the
 * pad upwards and the page is revealed behind it.
 *
 * Resolves just after liftoff, when the pixels start to clear, so the hero can start its own entrance then.
 */

const STEP = 0.5 // seconds per count
const ROCKET = { width: 84, height: 131 }
// The rocket's body centre and the bottom of its body, as fractions of its height (from the drawing).
const CENTRE = 45 / 140
const EXHAUST = 72 / 140

// The flight: a big loop around the window, as fractions of it. It starts on the pad and leaves through the top.
const FLIGHT: Array<[number, number]> = [
  [0.5, 0.3],
  [0.42, 0.12],
  [0.18, 0.1],
  [0.06, 0.35],
  [0.18, 0.62],
  [0.42, 0.8],
  [0.72, 0.74],
  [0.92, 0.48],
  [0.84, 0.18],
  [0.62, 0.02],
  [0.38, -0.25],
]

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  size: number
  smoke: boolean
}

const random = (low: number, high: number) => low + Math.random() * (high - low)
const wait = (seconds: number) => new Promise<void>((resolve) => void gsap.delayedCall(seconds, resolve))

export function playIntro(): Promise<void> {
  let root = document.documentElement
  let overlay = document.querySelector<HTMLElement>('[data-intro]')
  if (!overlay) {
    root.classList.remove('intro')
    return Promise.resolve()
  }
  let el = overlay
  let center = el.querySelector<HTMLElement>('[data-intro-center]')!
  let label = el.querySelector<HTMLElement>('[data-intro-label]')!
  let digit = el.querySelector<HTMLElement>('[data-intro-digit]')!
  let slot = el.querySelector<HTMLElement>('[data-intro-slot]')!
  let lines = [...el.querySelectorAll<HTMLElement>('.opening__line')]
  let rocket = el.querySelector<SVGElement>('[data-intro-rocket]')!
  let flame = el.querySelector<SVGElement>('[data-intro-flame]')!
  let flames = [...flame.querySelectorAll<SVGElement>('.rk__fire')]
  let canvas = el.querySelector<HTMLCanvasElement>('[data-intro-fire]')!
  let pixels = el.querySelector<HTMLElement>('[data-intro-px]')!

  let vw = window.innerWidth
  let vh = window.innerHeight
  let dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = Math.round(vw * dpr)
  canvas.height = Math.round(vh * dpr)
  let ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  // --- Setting the scene ------------------------------------------------------------------------------

  gsap.set(lines, { autoAlpha: 0, x: -10 })
  gsap.set(center, { autoAlpha: 0, y: 14 })
  gsap.set(digit, { autoAlpha: 0 })

  // The rocket stands on the pad with its body's base on the slot's bottom edge.
  let pad = slot.getBoundingClientRect()
  let baseX = pad.left + (pad.width - ROCKET.width) / 2
  let baseY = pad.bottom - ROCKET.height * EXHAUST
  let start: Point = { x: baseX + ROCKET.width / 2, y: baseY + ROCKET.height * CENTRE }
  gsap.set(rocket, { x: baseX, y: baseY, transformOrigin: `50% ${CENTRE * 100}%`, rotation: 0, autoAlpha: 0 })
  gsap.set(flame, { svgOrigin: '45 72', scaleY: 0 })

  // The flame flickers all the time; its overall length is set separately.
  gsap.set(flames, { transformOrigin: '50% 0%' })
  for (let part of flames) {
    gsap.to(part, { scaleY: 'random(0.8, 1.25)', scaleX: 'random(0.85, 1.1)', duration: 0.07, ease: 'none', repeat: -1, yoyo: true, repeatRefresh: true })
  }

  // --- Sparks: the fire and the smoke ------------------------------------------------------------------

  let sparks: Spark[] = []
  let shake = 0
  let flying = false
  let ticking = true

  function addFire(x: number, y: number, backX: number, backY: number, speed: number) {
    sparks.push({
      x: x + random(-3, 3),
      y: y + random(-3, 3),
      vx: backX * speed + random(-40, 40),
      vy: backY * speed + random(-40, 40),
      age: 0,
      life: random(0.45, 0.9),
      size: random(7, 14),
      smoke: false,
    })
  }

  function addSmoke(x: number, y: number) {
    let side = Math.random() < 0.5 ? -1 : 1
    sparks.push({ x: x + side * random(0, 30), y: y + random(-4, 4), vx: side * random(40, 170), vy: random(-45, -6), age: 0, life: random(0.9, 1.5), size: random(16, 32), smoke: true })
  }

  /** Fire colour along a spark's life: white-hot, yellow, orange, red, gone. */
  function fireColour(r: number): [number, number, number, number] {
    if (r < 0.15) return [255, 247, 214, 0.95]
    if (r < 0.45) return [250, 204, 21, 0.9]
    if (r < 0.75) return [251, 146, 60, 0.7]
    return [239, 68, 68, 0.5 * (1 - (r - 0.75) / 0.25)]
  }

  let last = 0
  function tick(time: number) {
    let dt = Math.min(0.05, last ? time - last : 0.016)
    last = time
    if (!ticking) return

    // Before the launch the rocket trembles on the pad, more and more as ignition nears.
    if (!flying && shake > 0) gsap.set(rocket, { x: baseX + random(-shake, shake), y: baseY + random(-shake, shake) * 0.6 })

    ctx.clearRect(0, 0, vw, vh)
    let alive: Spark[] = []
    for (let spark of sparks) {
      spark.age += dt
      let r = spark.age / spark.life
      if (r >= 1) continue
      spark.x += spark.vx * dt
      spark.y += spark.vy * dt
      spark.vx *= spark.smoke ? 0.985 : 0.97
      spark.vy += (spark.smoke ? -6 : -24) * dt
      alive.push(spark)
    }
    sparks = alive.length > 900 ? alive.slice(alive.length - 900) : alive

    // Smoke first, then the fire on top, added together so overlapping flames glow.
    for (let spark of sparks) {
      if (!spark.smoke) continue
      let r = spark.age / spark.life
      ctx.fillStyle = `rgba(150, 150, 162, ${((1 - r) * 0.2).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(spark.x, spark.y, spark.size * (0.7 + r * 1.1), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'lighter'
    for (let spark of sparks) {
      if (spark.smoke) continue
      let r = spark.age / spark.life
      let [red, green, blue, alpha] = fireColour(r)
      let size = spark.size * (1 - r * 0.75)
      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${(alpha * 0.3).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(spark.x, spark.y, size * 1.7, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`
      ctx.beginPath()
      ctx.arc(spark.x, spark.y, size * 0.7, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
  }
  gsap.ticker.add(tick)

  // --- The count ---------------------------------------------------------------------------------------

  // Fonts and the page itself, but never for long: the intro must not hold the site up.
  let ready = Promise.race([
    Promise.all([
      document.fonts.ready,
      document.readyState === 'complete' ? Promise.resolve() : new Promise((resolve) => window.addEventListener('load', resolve, { once: true })),
    ]),
    new Promise((resolve) => window.setTimeout(resolve, 3200)),
  ])

  function show(text: string, go = false) {
    digit.textContent = text
    digit.classList.toggle('is-go', go)
    gsap.fromTo(digit, { scale: go ? 0.7 : 1.45, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: go ? 0.5 : 0.4, ease: 'back.out(2)' })
  }

  function check(index: number) {
    gsap.to(lines[index]!, { autoAlpha: 1, x: 0, duration: 0.3, ease: 'power2.out' })
  }

  return new Promise<void>((revealStarted) => {
    void (async () => {
      await new Promise<void>((resolve) => gsap.to(center, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out', onComplete: resolve }))
      gsap.to(rocket, { autoAlpha: 1, duration: 0.3 })

      for (let n = 5; n >= 1; n--) {
        show(String(n))
        if (n >= 3) check(5 - n)
        // The trembling builds as the count falls.
        shake = (5 - n) * 0.45
        if (n === 1) {
          // Ignition: the flame lights, smoke rolls out along the ground and the rocket shakes hard.
          check(3)
          shake = 2.2
          gsap.to(flame, { scaleY: 0.45, duration: 0.5, ease: 'power2.out' })
          for (let i = 0; i < 4; i++) gsap.delayedCall(i * 0.1, () => {
            for (let k = 0; k < 7; k++) addSmoke(start.x, pad.bottom - 4)
          })
        }
        if (n <= 2) {
          // The exhaust starts to spit before it lifts.
          gsap.delayedCall(0.04, function again() {
            if (flying) return
            let power = n === 1 ? 3 : 1
            for (let k = 0; k < power; k++) addFire(start.x, baseY + ROCKET.height * EXHAUST + 6, 0, 1, random(60, 140))
            gsap.delayedCall(0.04, again)
          })
        }
        await wait(STEP)
      }

      // Zero: it waits only if the fonts and page are not ready yet, then lifts off.
      await ready
      show('liftoff', true)
      label.textContent = 'all systems go'
      shake = 0
      flying = true

      // The cover breaks into pixels that shrink away from the pad upwards, revealing the page.
      let size = Math.max(72, Math.round(vw / 10))
      let cols = Math.ceil(vw / size)
      let rows = Math.ceil(vh / size)
      pixels.style.gridTemplateColumns = `repeat(${cols}, ${size}px)`
      pixels.style.gridTemplateRows = `repeat(${rows}, ${size}px)`
      let blocks: HTMLElement[] = []
      let delays: number[] = []
      let farthest = Math.hypot(vw, vh)
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          let block = document.createElement('i')
          let roll = Math.random()
          let colour = roll < 0.1 ? 'var(--amber)' : roll < 0.2 ? 'color-mix(in oklab, var(--ink) 14%, var(--bg))' : 'var(--bg)'
          block.style.background = colour
          block.style.boxShadow = `0 0 0 1px ${colour}`
          blocks.push(block)
          let distance = Math.hypot((col + 0.5) * size - start.x, (row + 0.5) * size - pad.bottom)
          delays.push((distance / farthest) * 1.1 + Math.random() * 0.12)
        }
      }
      pixels.append(...blocks)
      gsap.set(blocks, { scale: 1.02 })
      el.classList.add('is-open')
      gsap.to(center, { autoAlpha: 0, duration: 0.35, delay: 0.25, ease: 'power2.in' })
      blocks.forEach((block, index) => {
        gsap.to(block, { scale: 0, duration: 0.4, ease: 'power2.in', delay: delays[index]! + 0.3 })
      })
      gsap.delayedCall(0.45, revealStarted)

      // The flight: up off the pad, then a loop around the whole window, speeding up all the way.
      let table = spline([start, ...FLIGHT.map(([fx, fy]) => ({ x: fx * vw, y: fy * vh })) ], 700)
      let lastIndex = table.length - 1
      let progress = { t: 0 }
      let heading = 0
      let previous: Point | null = null
      gsap.to(flame, { scaleY: 1.1, duration: 0.4, ease: 'power2.out' })

      await new Promise<void>((resolve) => {
        gsap.to(progress, {
          t: 1,
          duration: 2.2,
          ease: 'power1.in',
          onUpdate() {
            let at = progress.t * lastIndex
            let index = Math.floor(at)
            let from = table[index]!
            let to = table[Math.min(lastIndex, index + 1)]!
            let point = { x: from.x + (to.x - from.x) * (at - index), y: from.y + (to.y - from.y) * (at - index) }

            // Nose first: turn to face the way it is travelling, by the shortest way round.
            let ahead = table[Math.min(lastIndex, index + 3)]!
            let behind = table[Math.max(0, index - 3)]!
            let target = (Math.atan2(ahead.x - behind.x, -(ahead.y - behind.y)) * 180) / Math.PI
            heading += ((((target - heading) % 360) + 540) % 360) - 180
            gsap.set(rocket, { x: point.x - ROCKET.width / 2, y: point.y - ROCKET.height * CENTRE, rotation: heading })

            // The flame grows with speed, and the sparks pour from the exhaust along the way it has come.
            let rad = (heading * Math.PI) / 180
            let backX = -Math.sin(rad)
            let backY = Math.cos(rad)
            let exhaust = { x: point.x + backX * ROCKET.height * (EXHAUST - CENTRE), y: point.y + backY * ROCKET.height * (EXHAUST - CENTRE) }
            gsap.set(flame, { scaleY: 1.1 + progress.t * 0.9 })
            let gap = previous ? Math.hypot(exhaust.x - previous.x, exhaust.y - previous.y) : 0
            let count = Math.min(60, Math.max(3, Math.ceil(gap / 5)))
            for (let k = 0; k < count; k++) {
              let mix = previous ? k / count : 1
              let x = previous ? previous.x + (exhaust.x - previous.x) * mix : exhaust.x
              let y = previous ? previous.y + (exhaust.y - previous.y) * mix : exhaust.y
              addFire(x + backX * 8, y + backY * 8, backX, backY, random(30, 110))
            }
            previous = exhaust
          },
          onComplete: resolve,
        })
      })

      // Done: the sparks burn out, the cover is removed and the page is yours.
      gsap.to(rocket, { autoAlpha: 0, duration: 0.15 })
      gsap.to(canvas, { opacity: 0, duration: 0.4, ease: 'power1.out' })
      await wait(0.4)
      ticking = false
      gsap.ticker.remove(tick)
      gsap.killTweensOf([...flames, flame, rocket])
      root.classList.remove('intro')
      el.remove()
    })()
  })
}
