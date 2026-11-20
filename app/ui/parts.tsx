import type { Handle, RemixNode } from 'remix/component'

import type { Education, Experience, Media, Project, Site } from '../data/content.ts'
import { routes } from '../routes.ts'
import { iconSrc, toolIcons, type ToolIcon } from './tool-icons.ts'

/** The role with no end date, else the newest one. */
export function currentRole(experience: Experience[]): Experience | null {
  return experience.find((entry) => entry.end === null) ?? null
}

/** The earliest start month across every role, as stored ("2022-01"). */
export function earliestStart(experience: Experience[]): string | null {
  let starts = experience.map((entry) => entry.start).filter(Boolean)
  if (starts.length === 0) return null
  return starts.reduce((a, b) => (a < b ? a : b))
}

/** The role that started first. */
export function firstRole(experience: Experience[]): Experience | null {
  let start = earliestStart(experience)
  return experience.find((entry) => entry.start === start) ?? null
}

/** The education entry still running, else null. */
export function studying(site: Site | null): Education | null {
  if (!site) return null
  return site.education.find((entry) => entry.end === null) ?? null
}

/** "Full-stack engineer for…" as "full-stack engineer for…" for use after a colon. */
export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

/** A section heading: a status light, the title, and a small count on the right. */
export function SectionHead(
  handle: Handle<{ id: string; title: string; meta?: string; children?: RemixNode }>,
) {
  return () => {
    let { id, title, meta, children } = handle.props
    return (
      <div class="section-head">
        <div class="section-head__row">
          <span class="led" aria-hidden="true"></span>
          <h2 id={id} data-split="">
            {title}
          </h2>
          {meta ? <span class="label">{meta}</span> : null}
        </div>
        {children}
      </div>
    )
  }
}

/**
 * A statement section of its own: one short headline set large, one line under it, and at most one link.
 */
export function Statement(
  handle: Handle<{
    id: string
    heading: string
    lead?: string
    kicker?: string
    children?: RemixNode
  }>,
) {
  return () => {
    let { id, heading, lead, kicker, children } = handle.props
    return (
      <section class="section statement" id={id} aria-labelledby={`${id}-h`}>
        <div class="wrap">
          {kicker ? <p class="label statement__kicker">{kicker}</p> : null}
          <h2 id={`${id}-h`} class="statement__line" data-split="">
            {heading}
          </h2>
          {lead ? (
            <p class="lead" data-reveal="">
              {lead}
            </p>
          ) : null}
          {children}
        </div>
      </section>
    )
  }
}

export function ToolIconImg(
  handle: Handle<{ icon: ToolIcon; name: string; size: number; decorative?: boolean }>,
) {
  return () => {
    let { icon, name, size, decorative = false } = handle.props
    return (
      <img
        class="ic"
        src={iconSrc(icon)}
        alt={decorative ? '' : name}
        height={size}
        loading="lazy"
      />
    )
  }
}

/** A tool's real logo on a light plate, so every brand colour reads on both themes. */
export function ToolTile(handle: Handle<{ icon: ToolIcon; name: string; size?: 24 | 32 | 40 | 48 }>) {
  return () => {
    let { icon, name, size = 32 } = handle.props
    return (
      <span class={`tile tile--${size}`} title={name}>
        <img class="ic" src={iconSrc(icon)} alt="" loading="lazy" />
      </span>
    )
  }
}

export function ToolTiles(handle: Handle<{ names: string[]; limit?: number; size?: 24 | 32 | 40 | 48 }>) {
  return () => {
    let { names, limit = 6, size = 32 } = handle.props
    let icons = toolIcons(names, limit)
    if (icons.length === 0) return null
    return (
      <>
        {icons.map(({ name, icon }) => (
          <ToolTile key={icon.file} icon={icon} name={name} size={size} />
        ))}
      </>
    )
  }
}

/**
 * A project's picture: its cover image when the store holds that media, else the real logos of its stack
 * on a drafting panel. A cover id with no media behind it shows the logos, never a broken image.
 */
export function ProjectVisual(handle: Handle<{ project: Project; media: Map<string, Media> }>) {
  return () => {
    let { project, media } = handle.props
    if (project.previewImage) {
      return (
        <div class="visual" data-parallax="0.06">
          <img class="visual__img" src={project.previewImage} alt={`Screenshot of ${project.title}`} loading="lazy" />
        </div>
      )
    }
    let cover = project.coverMediaId ? media.get(project.coverMediaId) : undefined
    if (cover) {
      return (
        <div class="visual" data-parallax="0.06">
          <img class="visual__img" src={routes.media.href({ id: cover.id })} alt={cover.alt} loading="lazy" />
        </div>
      )
    }
    let icons = toolIcons(project.stack, 6)
    if (icons.length === 0) return null
    return (
      <div
        class="visual visual--tiles"
        data-parallax="0.06"
        role="img"
        aria-label={`Built with ${project.stack.join(', ')}`}
      >
        <div class="visual__tiles">
          {icons.map(({ name, icon }) => (
            <ToolTile key={icon.file} icon={icon} name={name} size={48} />
          ))}
        </div>
      </div>
    )
  }
}

/** The colour a tool chip is drawn in. Tools with no entry stay plain. */
const TONES: Array<[RegExp, 'amber' | 'green' | 'red' | 'blue']> = [
  [/^(node|bun|bullmq|mysql)/, 'amber'],
  [/^(mongodb|real-time|gsap)/, 'green'],
  [/^(redis|laravel)/, 'red'],
  [/^(postgres|socket|react$|tailwind|remix)/, 'blue'],
]

export function toolTone(name: string): 'amber' | 'green' | 'red' | 'blue' | null {
  let key = name.trim().toLowerCase()
  return TONES.find(([pattern]) => pattern.test(key))?.[1] ?? null
}
