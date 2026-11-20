import { gsap } from 'gsap'

/**
 * The message form. Any email link on the page opens it. Sending is a small piece of theatre: the form folds down
 * to a bar, a letter rises out of the bar, folds into a paper plane and flies a loop around the page, and the bar
 * becomes a "sent" card. The request goes out as the letter starts to rise, so the plane waits only if the
 * network is slow. With reduced motion there is no flight: the card just changes.
 */

// The sheet's outline at each stage of the folding. Every outline has five points so they can morph.
const SHEET = 'polygon(50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%)'
const HOUSE = 'polygon(50% 0%, 100% 28%, 100% 100%, 0% 100%, 0% 28%)'
const TRIANGLE = 'polygon(50% 0%, 97% 88%, 100% 100%, 0% 100%, 3% 88%)'

// The plane's loop around the page, as fractions of the window. It starts where the letter was folded.
const FLIGHT: Array<[number, number]> = [
  [0.62, 0.22],
  [0.4, 0.06],
  [0.12, 0.12],
  [-0.02, 0.4],
  [0.2, 0.68],
  [0.5, 0.74],
  [0.8, 0.7],
  [0.96, 0.45],
  [0.9, 0.2],
  [0.68, 0.3],
  [0.64, 0.55],
  [0.66, 0.85],
  [0.66, 1.12],
]

interface Point {
  x: number
  y: number
}

/** A smooth curve through the points (a Catmull-Rom spline), as a table of evenly stepped samples. */
function spline(points: Point[], samples: number): Point[] {
  let table: Point[] = []
  let steps = Math.ceil(samples / (points.length - 1))
  for (let i = 0; i < points.length - 1; i++) {
    let p0 = points[Math.max(0, i - 1)]!
    let p1 = points[i]!
    let p2 = points[i + 1]!
    let p3 = points[Math.min(points.length - 1, i + 2)]!
    for (let k = 0; k < steps; k++) {
      let t = k / steps
      let t2 = t * t
      let t3 = t2 * t
      let at = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      table.push({ x: at(p0.x, p1.x, p2.x, p3.x), y: at(p0.y, p1.y, p2.y, p3.y) })
    }
  }
  table.push(points[points.length - 1]!)
  return table
}

interface Reply {
  ok: boolean
  body: { error?: string; errors?: Record<string, string> }
}

export function initMailbox(reduced: boolean): void {
  let box = document.querySelector<HTMLDialogElement>('[data-mailbox]')
  if (!box || typeof box.showModal !== 'function') return
  let root = document.documentElement

  let find = <T extends HTMLElement | SVGElement>(selector: string): T => box!.querySelector<T>(selector)!
  let scrim = find<HTMLElement>('.mb__scrim')
  let card = find<HTMLElement>('[data-mb-card]')
  let form = find<HTMLFormElement>('[data-mb-form]')
  let fields = find<HTMLElement>('[data-mb-fields]')
  let fail = find<HTMLElement>('[data-mb-fail]')
  let hint = find<HTMLElement>('[data-mb-hint]')
  let sendButton = find<HTMLButtonElement>('[data-mb-send]')
  let label = find<HTMLElement>('[data-mb-label]')
  let done = find<HTMLElement>('[data-mb-done]')
  let time = find<HTMLElement>('[data-mb-time]')
  let letter = find<HTMLElement>('[data-mb-letter]')
  let sheet = find<HTMLElement>('[data-mb-sheet]')
  let paper = find<HTMLElement>('.mb__paper')
  let flaps = [...box.querySelectorAll<HTMLElement>('.mb__flap')]
  let dateLine = find<HTMLElement>('[data-mb-date]')
  let textLine = find<HTMLElement>('[data-mb-text]')
  let plane = find<SVGElement>('[data-mb-plane]')
  let glow = find<SVGPathElement>('[data-mb-glow]')
  let line = find<SVGPathElement>('[data-mb-line]')
  let trail = find<SVGSVGElement>('[data-mb-trail]')
  let inputs = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')]
  let owner = box.dataset.owner ?? ''

  let mac = /Mac|iPhone|iPad/.test(navigator.platform)
  let idleHint = `${mac ? '⌘' : 'Ctrl'} Enter to send`
  hint.textContent = idleHint
  done.setAttribute('role', 'status')

  // A fading gradient for the plane's trail, bright at the plane and gone at the far end.
  let svgNS = 'http://www.w3.org/2000/svg'
  let defs = document.createElementNS(svgNS, 'defs')
  let gradient = document.createElementNS(svgNS, 'linearGradient')
  gradient.setAttribute('id', 'mb-trail-fade')
  gradient.setAttribute('gradientUnits', 'userSpaceOnUse')
  for (let [offset, opacity] of [
    ['0', '0'],
    ['1', '1'],
  ] as const) {
    let stop = document.createElementNS(svgNS, 'stop')
    stop.setAttribute('offset', offset)
    stop.setAttribute('stop-color', '#facc15')
    stop.setAttribute('stop-opacity', opacity)
    gradient.append(stop)
  }
  defs.append(gradient)
  trail.prepend(defs)
  glow.setAttribute('stroke', 'url(#mb-trail-fade)')
  line.setAttribute('stroke', 'url(#mb-trail-fade)')

  let state: 'idle' | 'sending' | 'sent' = 'idle'
  let openedAt = Date.now()

  // --- Opening and closing ------------------------------------------------------------------------------

  function open() {
    if (box!.open) return
    if (state === 'sent') backToForm(true, false)
    box!.showModal()
    root.classList.add('mail-open')
    openedAt = Date.now()
    if (!reduced) {
      gsap.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none', clearProps: 'opacity' })
      gsap.fromTo(card, { y: 28, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out', clearProps: 'transform,opacity' })
    }
    let first = inputs.find((input) => input.value === '') ?? inputs[0]
    first?.focus()
  }

  function close() {
    if (!box!.open || state === 'sending') return
    let finish = () => {
      box!.close()
      root.classList.remove('mail-open')
      gsap.set([card, scrim], { clearProps: 'all' })
    }
    if (reduced) return finish()
    gsap.to(card, { y: 24, opacity: 0, duration: 0.25, ease: 'power2.in' })
    gsap.to(scrim, { opacity: 0, duration: 0.3, ease: 'none', onComplete: finish })
  }

  box.addEventListener('cancel', (event) => {
    event.preventDefault()
    close()
  })
  box.addEventListener('close', () => root.classList.remove('mail-open'))
  box.addEventListener('click', (event) => {
    if ((event.target as Element).closest('[data-mb-close]')) close()
  })

  // Every email link on the page opens the form. Without script they stay plain mailto links.
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    let link = (event.target as Element).closest?.('a[href^="mailto:"], [data-mail-open]')
    if (!link || box!.contains(link)) return
    event.preventDefault()
    open()
  })

  // --- The form -----------------------------------------------------------------------------------------

  function values() {
    let data = new FormData(form)
    let text = (name: string) => String(data.get(name) ?? '')
    return { name: text('name').trim(), email: text('email').trim(), message: text('message').trim(), website: text('website') }
  }

  function check(entry: ReturnType<typeof values>): Record<string, string> {
    let errors: Record<string, string> = {}
    if (!entry.name) errors.name = 'Please tell me your name.'
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(entry.email)) {
      errors.email = 'That email does not look right.'
    }
    if (entry.message.length < 5) errors.message = 'Write a few words first.'
    return errors
  }

  function showErrors(errors: Record<string, string>) {
    for (let input of inputs) {
      let message = errors[input.name] ?? ''
      let slot = form.querySelector<HTMLElement>(`[data-mb-err="${input.name}"]`)
      if (slot) slot.textContent = message
      if (message) input.setAttribute('aria-invalid', 'true')
      else input.removeAttribute('aria-invalid')
    }
    inputs.find((input) => errors[input.name])?.focus()
  }

  for (let input of inputs) {
    input.addEventListener('input', () => {
      input.removeAttribute('aria-invalid')
      let slot = form.querySelector<HTMLElement>(`[data-mb-err="${input.name}"]`)
      if (slot) slot.textContent = ''
    })
  }

  form.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      form.requestSubmit()
    }
  })

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (state !== 'idle') return
    let entry = values()
    let errors = check(entry)
    showErrors(errors)
    fail.hidden = true
    if (Object.keys(errors).length === 0) void send(entry)
  })

  function setSending(on: boolean) {
    card.classList.toggle('is-sending', on)
    card.classList.remove('is-flying')
    label.textContent = on ? 'Sending' : 'Send'
    sendButton.disabled = on
    for (let input of inputs) input.readOnly = on
    hint.textContent = on ? `On its way to ${owner}` : idleHint
  }

  // --- Sending ------------------------------------------------------------------------------------------

  async function send(entry: ReturnType<typeof values>) {
    state = 'sending'
    setSending(true)

    let controller = new AbortController()
    let timer = window.setTimeout(() => controller.abort(), 20000)
    let request: Promise<Reply> = fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, t: Date.now() - openedAt }),
      signal: controller.signal,
    })
      .then(async (response) => ({ ok: response.ok, body: await response.json().catch(() => ({})) }))
      .catch(() => ({ ok: false, body: { error: 'The message could not be sent. Check your connection and try again.' } }))
      .finally(() => window.clearTimeout(timer))

    if (reduced) {
      let reply = await request
      if (reply.ok) showDone(false)
      else showFailure(reply.body)
      return
    }

    let prelude = fold(entry.message)
    let [reply] = await Promise.all([request, prelude.finished])
    if (!reply.ok) {
      await unwind(prelude.timeline)
      showFailure(reply.body)
      return
    }
    await fly()
    showDone(true)
  }

  /** The form folds down to a bar, and the letter rises out of it and folds into a plane. */
  function fold(message: string) {
    let vw = window.innerWidth
    let vh = window.innerHeight
    let foot = form.querySelector<HTMLElement>('.mb__foot')!
    let style = getComputedStyle(card)
    let barHeight = foot.offsetHeight + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + 2
    let barY = (vh - barHeight) / 2 - 24
    let barTop = vh - 24 - barHeight

    let width = Math.min(340, vw * 0.82)
    let height = width * 1.22
    if (height > vh * 0.58) {
      height = vh * 0.58
      width = height / 1.22
    }
    let left = vw / 2 - width / 2
    let startY = barTop + barHeight / 2
    let endY = Math.max(8, barTop - height - 6)

    dateLine.textContent = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
    textLine.textContent = message.length > 160 ? `${message.slice(0, 160).trimEnd()}…` : message

    gsap.set(fields, { overflow: 'hidden', height: fields.offsetHeight })
    gsap.set(sheet, { clipPath: SHEET })
    gsap.set(flaps, { opacity: 0 })
    gsap.set(paper, { opacity: 1 })
    gsap.set(letter, { x: left, y: startY, width, height, scale: 0.96, scaleX: 0.96, transformOrigin: '50% 100%', autoAlpha: 0 })
    gsap.set(plane, { autoAlpha: 0 })

    let planeSize = width * 0.5
    let centerX = left + width / 2
    let centerY = endY + height - (height * 0.74) / 2

    let finished!: Promise<void>
    let timeline!: gsap.core.Timeline
    finished = new Promise<void>((resolve) => {
      timeline = gsap.timeline({ onComplete: resolve })
    })

    timeline
      // The form's fields fold away and the card drops to the bottom of the window as a bar.
      .to(fields, { height: 0, paddingBottom: 0, opacity: 0, duration: 0.4, ease: 'power3.inOut' }, 0)
      .to(card, { y: barY, duration: 0.8, ease: 'power3.inOut' }, 0)
      // The letter rises out of the bar.
      .set(letter, { autoAlpha: 1 }, 0.45)
      .to(letter, { y: endY, scale: 1, scaleX: 1, duration: 0.75, ease: 'power3.out' }, 0.45)
      // The top corners fold in, then the sides, then the whole thing narrows to a plane.
      .to(sheet, { clipPath: HOUSE, duration: 0.32, ease: 'power2.inOut' }, 1.25)
      .to(flaps, { opacity: 1, duration: 0.25 }, 1.25)
      .to(sheet, { clipPath: TRIANGLE, duration: 0.32, ease: 'power2.inOut' }, 1.6)
      .to(letter, { scaleY: 0.74, duration: 0.32, ease: 'power2.inOut' }, 1.6)
      .to(paper, { opacity: 0, duration: 0.2 }, 1.6)
      .to(letter, { scaleX: 0.42, duration: 0.26, ease: 'power2.in' }, 1.95)
      .set(plane, { autoAlpha: 1, x: centerX, y: centerY, xPercent: -50, yPercent: -50, width: planeSize, height: planeSize, rotation: -90, scale: 1 }, 2.18)
      .set(letter, { autoAlpha: 0 }, 2.18)
      .timeScale(1.2)

    return { timeline, finished }
  }

  /** The request failed: the plane unfolds and the form comes back as it was. */
  function unwind(timeline: gsap.core.Timeline): Promise<void> {
    return new Promise((resolve) => {
      timeline.eventCallback('onReverseComplete', () => {
        gsap.set([fields, card, letter, plane], { clearProps: 'all' })
        resolve()
      })
      timeline.timeScale(2.4).reverse()
    })
  }

  /** The plane loops around the window, drawing its trail, and leaves through the bottom. */
  function fly(): Promise<void> {
    let vw = window.innerWidth
    let vh = window.innerHeight
    let start: Point = { x: Number(gsap.getProperty(plane, 'x')), y: Number(gsap.getProperty(plane, 'y')) }
    let table = spline([start, ...FLIGHT.map(([fx, fy]) => ({ x: fx * vw, y: fy * vh }))], 420)
    let last = table.length - 1
    let heading = -90
    let progress = { t: 0 }

    gsap.set([glow, line], { opacity: 1 })

    return new Promise((resolve) => {
      gsap.to(progress, {
        t: 1,
        duration: 2.5,
        ease: 'sine.inOut',
        onUpdate() {
          let at = progress.t * last
          let index = Math.floor(at)
          let from = table[index]!
          let to = table[Math.min(last, index + 1)]!
          let point = { x: from.x + (to.x - from.x) * (at - index), y: from.y + (to.y - from.y) * (at - index) }

          // Turn to face the way it is travelling, by the shortest way round.
          let ahead = table[Math.min(last, index + 3)]!
          let behind = table[Math.max(0, index - 3)]!
          let angle = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI
          heading += ((((angle - heading) % 360) + 540) % 360) - 180
          gsap.set(plane, { x: point.x, y: point.y, rotation: heading, scale: 1 - 0.25 * progress.t })

          let tailIndex = Math.max(0, index - 110)
          let tail = table[tailIndex]!
          let d = `M${tail.x.toFixed(1)} ${tail.y.toFixed(1)}`
          for (let i = tailIndex + 1; i <= index; i++) d += ` L${table[i]!.x.toFixed(1)} ${table[i]!.y.toFixed(1)}`
          d += ` L${point.x.toFixed(1)} ${point.y.toFixed(1)}`
          glow.setAttribute('d', d)
          line.setAttribute('d', d)
          gradient.setAttribute('x1', String(tail.x))
          gradient.setAttribute('y1', String(tail.y))
          gradient.setAttribute('x2', String(point.x))
          gradient.setAttribute('y2', String(point.y))

          // The button gets its plane back as the real one leaves.
          if (progress.t > 0.86) card.classList.add('is-flying')
        },
        onComplete() {
          gsap.set(plane, { autoAlpha: 0 })
          gsap.to([glow, line], { opacity: 0, duration: 0.3, onComplete: resolve })
        },
      })
    })
  }

  // --- After sending ------------------------------------------------------------------------------------

  function showDone(animated: boolean) {
    state = 'sent'
    time.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    let before = card.offsetHeight
    form.style.display = 'none'
    done.hidden = false
    let after = card.offsetHeight
    let y = (window.innerHeight - after) / 2 - 24

    if (animated && !reduced) {
      gsap.fromTo(card, { height: before }, { height: after, y, duration: 0.5, ease: 'power3.out', onComplete: () => void gsap.set(card, { clearProps: 'height' }) })
      gsap.fromTo(done, { opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.5, ease: 'power2.out', clearProps: 'filter,opacity' })
    }
    done.querySelector<HTMLElement>('[data-mb-again]')?.focus()
  }

  function showFailure(body: Reply['body']) {
    state = 'idle'
    setSending(false)
    if (body.errors) showErrors(body.errors)
    fail.textContent = body.error ?? (body.errors ? '' : 'Something went wrong. Please try again.')
    fail.hidden = !fail.textContent
  }

  /** Back to the form: empty for another message, or with the same words to edit and resend. */
  function backToForm(clear: boolean, animated = true) {
    if (clear) {
      form.reset()
      showErrors({})
    }
    let before = card.offsetHeight
    done.hidden = true
    form.style.display = ''
    gsap.set(fields, { clearProps: 'all' })
    fail.hidden = true
    setSending(false)
    state = 'idle'
    openedAt = Date.now()

    if (animated && !reduced) {
      let after = card.offsetHeight
      gsap.fromTo(card, { height: before }, { height: after, y: 0, duration: 0.45, ease: 'power3.out', clearProps: 'height,transform' })
      gsap.fromTo(form, { opacity: 0 }, { opacity: 1, duration: 0.3, clearProps: 'opacity' })
    } else {
      gsap.set(card, { clearProps: 'all' })
    }
    ;(clear ? inputs[0] : inputs[inputs.length - 2])?.focus()
  }

  box.querySelector('[data-mb-again]')?.addEventListener('click', () => backToForm(true))
  box.querySelector('[data-mb-edit]')?.addEventListener('click', () => backToForm(false))
}
