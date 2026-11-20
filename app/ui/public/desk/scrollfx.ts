import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

import { parseSpeed } from '../motion/env.ts'
import { formatFigure, parseFigure } from './figure.ts'

/**
 * Everything that happens as the page scrolls. Content is complete in the HTML; the hidden starting
 * states below are set here, by script, only on elements that have not yet scrolled into view.
 */

function all<T extends HTMLElement = HTMLElement>(selector: string): T[] {
  return [...document.querySelectorAll<T>(selector)]
}

/** The ruler under the header: a marker for scroll progress and the name of the section in view. */
export function initRuler(): void {
  let ruler = document.querySelector<HTMLElement>('[data-ruler]')
  if (!ruler) return
  let label = ruler.querySelector<HTMLElement>('[data-ruler-label]')
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => ruler.style.setProperty('--p', self.progress.toFixed(4)),
  })
  for (let section of all('[data-ruler-section]')) {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (self) => {
        if (self.isActive && label) label.textContent = section.dataset.rulerSection ?? ''
      },
    })
  }
}

/** Which role is in view: the sticky list on About, and the line on the Home rail. Not motion, so it runs always. */
export function initTimelines(): void {
  for (let timeline of all('[data-timeline="sticky"]')) {
    let links = new Map<string, HTMLElement>()
    for (let link of timeline.querySelectorAll<HTMLElement>('[data-timeline-link]')) {
      links.set(link.dataset.timelineLink ?? '', link)
    }
    let entries = [...timeline.querySelectorAll<HTMLElement>('[data-timeline-entry]')]
    for (let entry of entries) {
      ScrollTrigger.create({
        trigger: entry,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (self) => {
          entry.classList.toggle('is-current', self.isActive)
          links.get(entry.dataset.timelineEntry ?? '')?.classList.toggle('is-current', self.isActive)
        },
      })
    }
  }
}

export function initRail(): void {
  for (let rail of all('[data-timeline="rail"]')) {
    rail.style.setProperty('--p', '0.04')
    ScrollTrigger.create({
      trigger: rail,
      start: 'top 85%',
      end: 'bottom 70%',
      scrub: 0.6,
      onUpdate: (self) => rail.style.setProperty('--p', Math.max(0.04, self.progress).toFixed(4)),
    })
  }
}

export function initScrollEffects(): void {
  splitHeadings()
  reveals()
  parallax()
  counters()
  slideWord()
  cycleWords()
}

function splitHeadings() {
  for (let heading of all('[data-split]:not([data-hero])')) {
    SplitText.create(heading, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit(self) {
        return gsap.from(self.lines, {
          yPercent: 110,
          duration: 0.9,
          ease: 'power4.out',
          stagger: 0.08,
          scrollTrigger: { trigger: heading, start: 'top 90%', once: true },
        })
      },
    })
  }
}

function reveals() {
  let items = all('[data-reveal]')
  if (items.length === 0) return
  gsap.set(items, { opacity: 0, y: 36, transition: 'none' })

  // ScrollTrigger measures every element's position when it refreshes. Elements still waiting to be
  // revealed sit 36px low, which would put every trigger below them 36px out. So the offset is lifted
  // while ScrollTrigger measures and put back after.
  let pending = new Set<HTMLElement>(items)
  ScrollTrigger.addEventListener('refreshInit', () => gsap.set([...pending], { y: 0 }))
  ScrollTrigger.addEventListener('refresh', () => gsap.set([...pending], { y: 36 }))

  ScrollTrigger.batch(items, {
    start: 'top 92%',
    once: true,
    onEnter: (batch) => {
      for (let item of batch) pending.delete(item as HTMLElement)
      return gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.85,
        ease: 'power3.out',
        stagger: 0.1,
        overwrite: true,
        clearProps: 'opacity,transform,transition',
      })
    },
  })
}

function parallax() {
  for (let element of all('[data-parallax]')) {
    let speed = parseSpeed(element.getAttribute('data-parallax'))
    if (speed === 0) continue
    gsap.fromTo(
      element,
      { yPercent: -speed * 60 },
      {
        yPercent: speed * 60,
        ease: 'none',
        scrollTrigger: { trigger: element, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    )
  }
}

function counters() {
  for (let element of all('[data-count]')) {
    let text = element.textContent ?? ''
    let figure = parseFigure(text)
    if (!figure) continue
    element.textContent = formatFigure(figure, 0)
    element.setAttribute('aria-label', text)
    let state = { progress: 0 }
    gsap.to(state, {
      progress: 1,
      duration: 1.8,
      ease: 'power2.out',
      scrollTrigger: { trigger: element, start: 'top 92%', once: true },
      onUpdate: () => {
        element.textContent = formatFigure(figure, state.progress)
      },
      onComplete: () => {
        element.textContent = text
      },
    })
  }
}

/** The big outlined name in the footer slides sideways as the footer scrolls into view. */
function slideWord() {
  for (let word of all('[data-slide]')) {
    let footer = word.closest('footer') ?? word
    gsap.fromTo(
      word,
      { xPercent: 8 },
      {
        xPercent: -14,
        ease: 'none',
        scrollTrigger: { trigger: footer, start: 'top bottom', end: 'bottom bottom', scrub: true },
      },
    )
  }
}

/** The Work page headline: the stack word changes every few seconds. */
function cycleWords() {
  for (let element of all('[data-cycle]')) {
    let words: string[] = []
    try {
      let parsed: unknown = JSON.parse(element.dataset.cycle ?? '[]')
      if (Array.isArray(parsed)) words = parsed.filter((word): word is string => typeof word === 'string')
    } catch {
      continue
    }
    let first = (element.textContent ?? '').replace(/\.$/, '')
    let list = [first, ...words]
    if (list.length < 2) continue
    let index = 0
    window.setInterval(() => {
      if (document.hidden) return
      index = (index + 1) % list.length
      gsap
        .timeline()
        .to(element, { yPercent: -60, opacity: 0, duration: 0.25, ease: 'power2.in' })
        .add(() => {
          element.textContent = `${list[index]}.`
        })
        .fromTo(element, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.35, ease: 'power3.out' })
    }, 2600)
  }
}
