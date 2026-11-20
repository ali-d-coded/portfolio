const CELL = 28
/** How far, in pixels, the pointer reaches; a dot swells by how close it is, so the trail is round and soft-edged. */
const REACH = 46
const LIFE = 2000

interface Lit {
  col: number
  row: number
  start: number
  white: boolean
  peak: number
}

/**
 * The dotted floor reacts to the pointer: dots near it swell and light up yellow or white, each a moment
 * after the one before, then settle back. It is drawn on a canvas that sits behind the page, so cards and
 * every other component cover it; nothing is ever painted on top of content.
 */
export function initDotGrid(): void {
  let canvas = document.createElement('canvas')
  canvas.className = 'dotfx'
  canvas.setAttribute('aria-hidden', 'true')
  document.body.append(canvas)
  let context = canvas.getContext('2d')
  if (!context) return
  let ctx = context

  let lit = new Map<string, Lit>()
  let running = false
  let ratio = 1

  function resize() {
    ratio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(window.innerWidth * ratio)
    canvas.height = Math.round(window.innerHeight * ratio)
  }
  resize()
  window.addEventListener('resize', resize)

  function frame(now: number) {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    let light = document.documentElement.dataset.theme === 'light'
    for (let [key, dot] of lit) {
      let age = now - dot.start
      if (age > LIFE) {
        lit.delete(key)
        continue
      }
      if (age < 0) continue
      // Up quickly, back down slowly.
      let t = age / LIFE
      let level = t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92
      level = level * level * (3 - 2 * level)
      ctx.globalAlpha = Math.min(1, level * dot.peak * 1.2 + 0.001)
      ctx.fillStyle = dot.white ? (light ? '#212124' : '#ffffff') : '#facc15'
      ctx.beginPath()
      ctx.arc(dot.col * CELL + CELL / 2, dot.row * CELL + CELL / 2, 1 + level * dot.peak * 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    if (lit.size > 0) requestAnimationFrame(frame)
    else running = false
  }

  function light(x: number, y: number, now: number) {
    let reach = Math.ceil(REACH / CELL)
    let cx = Math.floor(x / CELL)
    let cy = Math.floor(y / CELL)
    for (let row = cy - reach; row <= cy + reach; row++) {
      for (let col = cx - reach; col <= cx + reach; col++) {
        let distance = Math.hypot((col + 0.5) * CELL - x, (row + 0.5) * CELL - y)
        if (distance > REACH) continue
        let peak = Math.pow(1 - distance / REACH, 1.4)
        let key = `${col}:${row}`
        let current = lit.get(key)
        // A dot already lit at least this strongly is left alone, so a steady move does not restart it.
        if (current && now - current.start < LIFE * 0.5 && current.peak >= peak) continue
        let white = current ? current.white : (col * 7 + row * 13) % 5 < 2
        lit.set(key, { col, row, start: now + distance * 1.2, white, peak })
      }
    }
  }

  let lastX = -1
  let lastY = -1
  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return
    let now = performance.now()
    // Fill in the path between two events, so a fast sweep still leaves one unbroken, long tail.
    let fromX = lastX < 0 ? event.clientX : lastX
    let fromY = lastY < 0 ? event.clientY : lastY
    let steps = Math.min(60, Math.ceil(Math.hypot(event.clientX - fromX, event.clientY - fromY) / 6))
    for (let step = 1; step <= Math.max(steps, 1); step++) {
      let t = steps === 0 ? 1 : step / steps
      light(fromX + (event.clientX - fromX) * t, fromY + (event.clientY - fromY) * t, now)
    }
    lastX = event.clientX
    lastY = event.clientY
    if (!running) {
      running = true
      requestAnimationFrame(frame)
    }
  })
}
