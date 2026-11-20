import { gsap } from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

import { hasFinePointer, prefersReducedMotion } from '../motion/env.ts'
import { initPipeline, initSkills } from './panels.ts'
import { initCursor, initMagnetic, initPreview } from './pointer.ts'
import { initRail, initRuler, initScrollEffects, initTimelines } from './scrollfx.ts'
import { initSmooth } from './smooth.ts'
import { initTheme } from './theme.ts'
import { dropToys, initToys } from './toys.ts'
import { initTransitions } from './transitions.ts'

gsap.registerPlugin(ScrollTrigger, Draggable, InertiaPlugin, SplitText)

/** The hero arrives: headline lines rise out of their masks, the other pieces follow, the toys drop in. */
async function enter() {
  let root = document.documentElement
  let hero = document.querySelector<HTMLElement>('[data-hero]')
  let pieces = [...document.querySelectorAll<HTMLElement>('[data-enter]')]

  // Wait for the fonts so the lines split where they will really break, but never for long.
  await Promise.race([document.fonts.ready, new Promise((resolve) => window.setTimeout(resolve, 1200))])

  let split = hero ? SplitText.create(hero, { type: 'lines', mask: 'lines' }) : null
  if (split) gsap.set(split.lines, { yPercent: 115 })
  gsap.set(pieces, { opacity: 0, y: 24 })
  root.classList.add('ready')

  let delay = root.classList.contains('arrive') ? 0.55 : 0.05
  if (split) {
    gsap.to(split.lines, { yPercent: 0, duration: 1, ease: 'power4.out', stagger: 0.09, delay })
  }
  gsap.to(pieces, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.09, delay: delay + 0.25, clearProps: 'opacity,transform' })
  dropToys()
}

function start() {
  let reduced = prefersReducedMotion()
  let fine = hasFinePointer()

  initTheme(reduced)
  initTransitionsFor(reduced)
  initSkills()
  initPipeline(reduced)
  initToys(reduced)
  initRuler()
  initTimelines()

  if (reduced) {
    document.documentElement.classList.add('ready')
    return
  }

  if (fine) {
    initSmooth()
    initCursor()
    initMagnetic()
    initPreview()
  }
  initRail()
  initScrollEffects()
  void enter()
}

function initTransitionsFor(reduced: boolean) {
  // With reduced motion the browser navigates normally, with no curtain.
  if (!reduced) initTransitions()
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
else start()
