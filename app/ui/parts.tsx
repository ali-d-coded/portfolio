import type { Handle, RemixNode } from 'remix/component'

import type { Education, Experience, Media, Project, Site } from '../data/content.ts'
import { routes } from '../routes.ts'
import { iconClass, iconSrc, toolIcons, type ToolIcon } from './tool-icons.ts'

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

/** The education entry still running, else the first one. */
export function studying(site: Site | null): Education | null {
  if (!site) return null
  return site.education.find((entry) => entry.end === null) ?? null
}

/** "Full-stack engineer for…" as "full-stack engineer for…" for use after a colon. */
export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

/**
 * A statement section of its own: one short headline set large (the liquid-type moment), one line under it,
 * and at most one link. It is the page's dealt moment, one screen tall.
 */
export function Statement(
  handle: Handle<{
    id: string
    heading: string
    lead?: string
    ground?: string
    children?: RemixNode
  }>,
) {
  return () => {
    let { id, heading, lead, ground, children } = handle.props
    return (
      <section
        class={ground ? `section statement ${ground}` : 'section statement'}
        id={id}
        aria-labelledby={`${id}-h`}
      >
        <div class="wrap">
          <div data-moment="liquid-type">
            <h2 id={`${id}-h`} class="mo-lt__type" data-split="">
              {heading}
            </h2>
            {lead ? <p class="statement__lead">{lead}</p> : null}
            {children}
          </div>
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
        class={iconClass(icon, size)}
        src={iconSrc(icon)}
        alt={decorative ? '' : name}
        height={size}
        loading="lazy"
      />
    )
  }
}

/**
 * A project's picture: its cover image when the store holds that media, else the real logos of its stack
 * on a lit panel. A cover id with no media behind it shows the logos, never a broken image.
 */
export function ProjectVisual(handle: Handle<{ project: Project; media: Map<string, Media> }>) {
  return () => {
    let { project, media } = handle.props
    let cover = project.coverMediaId ? media.get(project.coverMediaId) : undefined
    if (cover) {
      return (
        <div class="panel" data-parallax="0.1">
          <img
            class="frame__img"
            src={routes.media.href({ id: cover.id })}
            alt={cover.alt}
            loading="lazy"
            data-source="client"
            data-subject={cover.alt}
          />
        </div>
      )
    }
    let icons = toolIcons(project.stack, 6)
    if (icons.length === 0) return null
    return (
      <div class="panel" data-parallax="0.1" role="img" aria-label={`Built with ${project.stack.join(', ')}`}>
        <div class="tool-tiles">
          {icons.map(({ name, icon }) => (
            <span key={icon.file} class="ic-tile ic-tile--48">
              <ToolIconImg icon={icon} name={name} size={28} decorative />
            </span>
          ))}
        </div>
      </div>
    )
  }
}
