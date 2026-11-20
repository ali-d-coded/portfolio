import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { matches } from './match.ts'

function tools(element: HTMLElement): string[] {
  return (element.dataset.tools ?? '').split('|').filter(Boolean)
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

/** Pick a skill group: the projects and roles that used any of its tools light up, the rest dim. */
export function initSkills(): void {
  let root = document.querySelector<HTMLElement>('[data-skills]')
  if (!root) return
  let status = document.querySelector<HTMLElement>('[data-skills-status]')
  let groups = [...root.querySelectorAll<HTMLElement>('[data-skill-group]')]
  let projects = [...document.querySelectorAll<HTMLElement>('[data-project][data-tools]')]
  let roles = [...document.querySelectorAll<HTMLElement>('[data-timeline-entry][data-tools]')]
  let current: HTMLElement | null = null

  function show(group: HTMLElement | null) {
    current = group
    for (let item of groups) {
      let on = item === group
      item.classList.toggle('is-picked', on)
      item.querySelector('.skill__pick')?.setAttribute('aria-pressed', String(on))
    }
    for (let target of [...projects, ...roles]) target.classList.remove('is-match', 'is-dim')
    if (!group) {
      if (status) status.textContent = 'No group selected.'
      return
    }
    let list = tools(group)
    let projectHits = 0
    let roleHits = 0
    for (let target of projects) {
      let hit = matches(list, tools(target))
      target.classList.toggle('is-match', hit)
      target.classList.toggle('is-dim', !hit)
      if (hit) projectHits += 1
    }
    for (let target of roles) {
      let hit = matches(list, tools(target))
      target.classList.toggle('is-match', hit)
      target.classList.toggle('is-dim', !hit)
      if (hit) roleHits += 1
    }
    let name = group.querySelector('.skill__pick')?.textContent?.trim() ?? 'This group'
    if (status) {
      status.textContent = `${name}: used in ${plural(projectHits, 'project', 'projects')} and ${plural(roleHits, 'role', 'roles')}.`
    }
  }

  for (let group of groups) {
    group.querySelector('.skill__pick')?.addEventListener('click', () => show(current === group ? null : group))
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && current) show(null)
  })
}

/**
 * The route of a message through a project: the desk's paper plane flies from stop to stop along an amber trail
 * while one line says, in plain words, what that stop protects. Pick any stop to follow the message from there.
 */
export function initPipeline(reduced: boolean): void {
  let route = document.querySelector<HTMLElement>('[data-route]')
  if (!route) return
  let root = route
  let stops = [...root.querySelectorAll<HTMLElement>('.route__stop')]
  let plane = root.querySelector<HTMLElement>('.route__plane')
  let trail = root.querySelector<HTMLElement>('.route__trail')
  let says = root.querySelector<HTMLElement>('[data-route-says]')
  let replay = document.querySelector<HTMLElement>('[data-route-replay]')
  if (stops.length < 2 || !plane || !trail || !says) return
  let flight = plane
  let line = trail
  let note = says

  let active = -1
  let timer = 0

  function centre(index: number) {
    let from = root.getBoundingClientRect()
    let box = stops[index]!.querySelector<HTMLElement>('.route__node')!.getBoundingClientRect()
    return { x: box.left - from.left + box.width / 2, y: box.top - from.top + box.height / 2 }
  }

  // The stops sit in a row on wide screens and in a column on narrow ones.
  function vertical() {
    return stops[1]!.getBoundingClientRect().top > stops[0]!.getBoundingClientRect().top + 10
  }

  function say(index: number) {
    let stop = stops[index]!
    let name = stop.querySelector('.route__pick')?.textContent ?? ''
    let benefit = stop.querySelector<HTMLElement>('.route__pick')?.dataset.benefit ?? ''
    note.querySelector('strong')!.textContent = name
    note.querySelector('span')!.textContent = benefit
    if (!reduced) gsap.fromTo(note.children, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power3.out', stagger: 0.05 })
  }

  function place(index: number, instant: boolean) {
    let here = centre(index)
    let start = centre(0)
    let up = vertical()
    // The plane's nose points up and to the left in the drawing; turn it to the way it is travelling.
    let before = index > 0 ? centre(index - 1) : centre(1)
    let heading = (Math.atan2(here.y - before.y, here.x - before.x) * 180) / Math.PI
    if (index === 0) heading = up ? 90 : 0
    let vars = { x: here.x, y: here.y, rotation: heading + 135 }
    let reach = up ? { height: here.y - start.y, width: 3 } : { width: here.x - start.x, height: 3 }
    if (instant || reduced) {
      gsap.set(flight, vars)
      gsap.set(line, reach)
    } else {
      gsap.to(flight, { ...vars, duration: 0.75, ease: 'power2.inOut', overwrite: 'auto' })
      gsap.fromTo(flight.firstElementChild, { scale: 1 }, { scale: 1.3, duration: 0.37, yoyo: true, repeat: 1, ease: 'power2.out', overwrite: 'auto' })
      gsap.to(line, { ...reach, duration: 0.75, ease: 'power2.inOut', overwrite: 'auto' })
    }
  }

  function go(index: number, instant = false) {
    active = index
    stops.forEach((stop, position) => {
      stop.classList.toggle('is-active', position === index)
      stop.classList.toggle('is-done', position < index)
    })
    say(index)
    place(index, instant)
  }

  function stop() {
    window.clearTimeout(timer)
  }

  function play(from = 0) {
    stop()
    let index = from
    let step = () => {
      go(index)
      index += 1
      if (index < stops.length) timer = window.setTimeout(step, reduced ? 600 : 1100)
    }
    step()
  }

  // The plane waits at the first stop until the route comes into view, then flies it once.
  root.classList.add('is-ready')
  gsap.set(line, { transformOrigin: '0 0' })
  go(0, true)

  stops.forEach((item, index) => {
    item.querySelector('.route__pick')?.addEventListener('click', () => {
      stop()
      play(index)
    })
  })
  replay?.addEventListener('click', () => play(0))
  window.addEventListener('resize', () => {
    if (active >= 0) place(active, true)
  })

  ScrollTrigger.create({ trigger: root, start: 'top 70%', once: true, onEnter: () => play(0) })
}
