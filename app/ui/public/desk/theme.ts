import { gsap } from 'gsap'

/** The sun and moon note: switches the theme, remembers it, and flips the icon with a small spin. */
export function initTheme(reduced: boolean): void {
  let button = document.querySelector<HTMLButtonElement>('[data-theme-toggle]')
  if (!button) return
  let root = document.documentElement
  let caption = button.querySelector<HTMLElement>('[data-theme-caption]')
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')

  function sync() {
    let light = root.dataset.theme === 'light'
    button!.setAttribute('aria-label', light ? 'Switch to the dark theme' : 'Switch to the light theme')
    if (caption) caption.textContent = light ? 'dark mode' : 'light mode'
    if (meta) meta.content = light ? '#fbfbf9' : '#111113'
  }
  sync()

  let busy = false
  button.addEventListener('click', () => {
    if (busy) return
    let next = root.dataset.theme === 'light' ? 'dark' : 'light'

    function flip() {
      root.dataset.theme = next
      try {
        localStorage.setItem('theme', next)
      } catch {
        // Private windows can refuse storage; the choice then lasts for this page only.
      }
      sync()
    }

    if (reduced) {
      flip()
      return
    }
    busy = true
    let box = button!.getBoundingClientRect()
    pixelSwap({ x: box.left + box.width / 2, y: box.top + box.height / 2 }, next, flip, () => {
      busy = false
      let icon = button!.querySelector(next === 'light' ? '.moon' : '.sun')
      if (icon) {
        gsap.fromTo(
          icon,
          { rotation: -120, scale: 0.3, opacity: 0, transformOrigin: '50% 50%' },
          { rotation: 0, scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(2)' },
        )
      }
    })
  })
}

/**
 * The theme change: big square pixels in the new theme's colours pop in, rippling outwards from the button,
 * the theme flips once they cover the page, and they pop away in the same ripple.
 */
function pixelSwap(origin: { x: number; y: number }, next: string, flip: () => void, done: () => void) {
  let width = window.innerWidth
  let height = window.innerHeight
  let size = Math.max(72, Math.round(width / 10))
  let cols = Math.ceil(width / size)
  let rows = Math.ceil(height / size)
  let paper = next === 'light' ? '#fbfbf9' : '#111113'
  let ink = next === 'light' ? '#212124' : '#f4f4f6'

  let layer = document.createElement('div')
  layer.className = 'themefx'
  layer.setAttribute('aria-hidden', 'true')
  layer.style.gridTemplateColumns = `repeat(${cols}, ${size}px)`
  layer.style.gridTemplateRows = `repeat(${rows}, ${size}px)`

  let blocks: HTMLElement[] = []
  let delays: number[] = []
  let farthest = 1
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      farthest = Math.max(farthest, Math.hypot((col + 0.5) * size - origin.x, (row + 0.5) * size - origin.y))
    }
  }
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let block = document.createElement('i')
      let roll = Math.random()
      let colour = roll < 0.14 ? '#facc15' : roll < 0.26 ? ink : paper
      block.style.background = colour
      block.style.boxShadow = `0 0 0 1px ${colour}`
      blocks.push(block)
      let distance = Math.hypot((col + 0.5) * size - origin.x, (row + 0.5) * size - origin.y)
      delays.push((distance / farthest) * 0.5 + Math.random() * 0.1)
    }
  }
  layer.append(...blocks)
  document.body.append(layer)
  gsap.set(blocks, { scale: 0 })

  let tl = gsap.timeline({
    onComplete: () => {
      layer.remove()
      done()
    },
  })
  blocks.forEach((block, index) => {
    tl.to(block, { scale: 1.02, duration: 0.3, ease: 'power2.out' }, delays[index]!)
  })
  tl.add(flip)
  // Coloured blocks settle to the page colour first, so nothing flashes as the pixels clear.
  tl.to(blocks, { backgroundColor: paper, boxShadow: `0 0 0 1px ${paper}`, duration: 0.15, ease: 'none' })
  tl.addLabel('clear')
  blocks.forEach((block, index) => {
    tl.to(block, { scale: 0, duration: 0.35, ease: 'power2.in' }, `clear+=${delays[index]!}`)
  })
}
