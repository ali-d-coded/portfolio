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

/** The EazyCRM pipeline: a message travels stage by stage; pick any stage to follow it from there. */
export function initPipeline(reduced: boolean): void {
  let list = document.querySelector<HTMLElement>('[data-pipeline]')
  if (!list) return
  let stages = [...list.querySelectorAll<HTMLElement>('.pipe__stage')]
  if (stages.length === 0) return

  let packet = document.createElement('span')
  packet.className = 'pipe__packet'
  packet.setAttribute('aria-hidden', 'true')
  list.append(packet)

  let replay = document.createElement('button')
  replay.type = 'button'
  replay.className = 'btn btn--ghost pipe__replay'
  replay.textContent = 'Send the message again'
  list.after(replay)

  let active = -1
  let timer = 0

  function place(index: number, instant: boolean) {
    let stage = stages[index]
    if (!stage) return
    let from = list!.getBoundingClientRect()
    let box = stage.getBoundingClientRect()
    let vars = { x: box.left - from.left + box.width / 2, y: box.top - from.top, opacity: 1 }
    if (instant || reduced) gsap.set(packet, vars)
    else gsap.to(packet, { ...vars, duration: 0.6, ease: 'power2.inOut', overwrite: 'auto' })
  }

  function go(index: number, instant = false) {
    active = index
    stages.forEach((stage, position) => {
      stage.classList.toggle('is-active', position === index)
      stage.classList.toggle('is-done', position < index)
    })
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
      if (index < stages.length) timer = window.setTimeout(step, reduced ? 500 : 820)
    }
    step()
  }

  stages.forEach((stage, index) => {
    stage.querySelector('.pipe__pick')?.addEventListener('click', () => {
      stop()
      play(index)
    })
  })
  replay.addEventListener('click', () => play(0))
  window.addEventListener('resize', () => {
    if (active >= 0) place(active, true)
  })

  ScrollTrigger.create({ trigger: list, start: 'top 75%', once: true, onEnter: () => play(0) })
}
