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

  button.addEventListener('click', () => {
    let next = root.dataset.theme === 'light' ? 'dark' : 'light'
    root.classList.add('theme-fade')
    root.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {
      // Private windows can refuse storage; the choice then lasts for this page only.
    }
    sync()
    if (!reduced) {
      let icon = button!.querySelector(next === 'light' ? '.moon' : '.sun')
      if (icon) {
        gsap.fromTo(
          icon,
          { rotation: -120, scale: 0.3, opacity: 0, transformOrigin: '50% 50%' },
          { rotation: 0, scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(2)' },
        )
      }
    }
    window.setTimeout(() => root.classList.remove('theme-fade'), 450)
  })
}
