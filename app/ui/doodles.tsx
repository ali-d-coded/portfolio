import type { Handle } from 'remix/component'

import type { Education, Experience, Figure, Site } from '../data/content.ts'
import { formatMonth, handleOf } from './format.ts'

/**
 * The desk: small objects a visitor can pick up. Every object is real markup that reads and works with no
 * script; `desk/toys.ts` adds dragging, swinging and the click tricks. Nothing here claims anything the
 * resume does not: the badge and the note carry facts from the content store, the rest is decoration.
 */

export interface DeskFigure extends Figure {
  project: string
}

export interface DeskProps {
  site: Site | null
  now: Experience | null
  since: string | null
  stack: string[]
  degree: Education | null
  figures: DeskFigure[]
  /** `home` carries the badge and the note too; `contact` is the stickers and the toys only. */
  variant: 'home' | 'contact'
}

export function Desk(handle: Handle<DeskProps>) {
  return () => {
    let { site, now, since, stack, degree, figures, variant } = handle.props
    let home = variant === 'home'

    return (
      <div class="desk" data-desk="" data-variant={variant}>
        {home && site ? (
          <Badge site={site} now={now} since={since} stack={stack} degree={degree} />
        ) : null}
        {home && figures.length > 0 ? <Sticky figures={figures} /> : null}
        {site?.githubUrl ? <Sticker kind="github" href={site.githubUrl} /> : null}
        {site?.linkedinUrl ? <Sticker kind="linkedin" href={site.linkedinUrl} /> : null}
        {site?.email ? <Sticker kind="mail" href={`mailto:${site.email}`} /> : null}
        <Mug />
        {home ? <Gears /> : null}
        <Rocket />
        <div class="desk__tools" role="group" aria-label="Desk toys">
          <span class="label">Desk toys</span>
          <button type="button" data-desk-scatter="">
            Scatter
          </button>
          <button type="button" data-desk-tidy="">
            Tidy
          </button>
        </div>
      </div>
    )
  }
}

function Badge(
  handle: Handle<{
    site: Site
    now: Experience | null
    since: string | null
    stack: string[]
    degree: Education | null
  }>,
) {
  return () => {
    let { site, now, since, stack, degree } = handle.props
    return (
      <div class="toy toy--badge" data-toy="badge" data-rot="-1.5" data-cursor="drag">
        <span class="badge__strap" aria-hidden="true"></span>
        <div class="badge">
          <span class="badge__hole" aria-hidden="true"></span>
          <p class="badge__name">
            <span class="led" aria-hidden="true"></span>
            {site.name}
          </p>
          {site.role ? <p class="badge__role">{site.role.split('|')[0]!.trim()}</p> : null}
          <dl class="badge__facts">
            {now ? (
              <div>
                <dt>Now</dt>
                <dd>
                  {now.role}, {now.company}
                </dd>
              </div>
            ) : null}
            {since ? (
              <div>
                <dt>Since</dt>
                <dd>{formatMonth(since)}</dd>
              </div>
            ) : null}
            {stack.length > 0 ? (
              <div>
                <dt>Stack</dt>
                <dd>{stack.join(', ')}</dd>
              </div>
            ) : null}
            {degree ? (
              <div>
                <dt>Studying</dt>
                <dd>{degree.degree}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    )
  }
}

function Sticky(handle: Handle<{ figures: DeskFigure[] }>) {
  return () => (
    <div class="toy toy--sticky" data-toy="sticky" data-rot="3" data-cursor="drag">
      <i class="pin" aria-hidden="true"></i>
      <ul class="sticky__list">
        {handle.props.figures.map((figure, index) => (
          <li key={index}>
            <span class="sticky__value">{figure.value}</span>
            <span class="sticky__label">
              {figure.label} <em>on {figure.project}</em>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

type StickerKind = 'github' | 'linkedin' | 'mail'

function Sticker(handle: Handle<{ kind: StickerKind; href: string }>) {
  return () => {
    let { kind, href } = handle.props
    let label =
      kind === 'mail' ? 'email' : kind === 'github' ? handleOf(href) : `/${handleOf(href)}`
    let rot = kind === 'github' ? '5' : kind === 'linkedin' ? '-6' : '4'
    return (
      <a
        class={`toy toy--sticker toy--${kind}`}
        data-toy="sticker"
        data-rot={rot}
        data-cursor="drag"
        href={href}
        rel={kind === 'mail' ? undefined : 'me noopener'}
        target={kind === 'mail' ? undefined : '_blank'}
        aria-label={kind === 'mail' ? 'Email' : kind === 'github' ? 'GitHub' : 'LinkedIn'}
      >
        <i class={`washi washi--${kind}`} aria-hidden="true"></i>
        <span class="sticker__face">
          {kind === 'github' ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"
              />
            </svg>
          ) : kind === 'linkedin' ? (
            <span class="sticker__in" aria-hidden="true">
              in
            </span>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 7l10 7 10-7" />
            </svg>
          )}
          <span class="sticker__text">{label}</span>
        </span>
      </a>
    )
  }
}

function Mug() {
  return () => (
    <button
      type="button"
      class="toy toy--mug"
      data-toy="mug"
      data-rot="-3"
      data-cursor="drag"
      aria-label="Coffee mug. Press to refill it."
    >
      <svg viewBox="0 0 80 90" aria-hidden="true">
        <path class="steam steam--a" d="M34 20 C32 14 38 10 36 4" />
        <path class="steam steam--b" d="M44 22 C42 15 48 11 46 5" />
        <rect class="mug__body" x="25" y="26" width="36" height="42" rx="4" />
        <path class="mug__handle" d="M61 32 C71 32 71 50 61 52" />
        <path class="mug__coffee" d="M28 34 H58" />
        <ellipse class="mug__saucer" cx="43" cy="69" rx="24" ry="4" />
      </svg>
      <span class="toy__cap" data-mug-cap="">
        coffee &amp; queues
      </span>
    </button>
  )
}

function Gears() {
  return () => (
    <button
      type="button"
      class="toy toy--gears"
      data-toy="gears"
      data-rot="0"
      data-cursor="drag"
      aria-label="Gears. Press to spin them."
    >
      <svg viewBox="0 0 90 90" aria-hidden="true">
        <g class="gear gear--a">
          <circle cx="40" cy="40" r="24" class="gear__teeth" />
          <circle cx="40" cy="40" r="12" class="gear__hub" />
          <path d="M40 28V40" class="gear__spoke" />
        </g>
        <g class="gear gear--b">
          <circle cx="66" cy="66" r="13" class="gear__teeth gear__teeth--b" />
          <path d="M66 59V66" class="gear__spoke gear__spoke--b" />
        </g>
      </svg>
      <span class="toy__cap">BullMQ workers</span>
    </button>
  )
}

function Rocket() {
  return () => (
    <button
      type="button"
      class="toy toy--rocket"
      data-toy="rocket"
      data-rot="6"
      data-cursor="drag"
      aria-label="Rocket. Press to launch it."
    >
      <svg viewBox="0 0 90 100" aria-hidden="true">
        <path class="flame" d="M38 74 Q45 100 52 74 Z" />
        <path class="rocket__fin" d="M30 62 L18 72 L32 75 Z" />
        <path class="rocket__fin" d="M60 62 L72 72 L58 75 Z" />
        <path class="rocket__body" d="M45 15 C33 30 31 55 31 72 L59 72 C59 55 57 30 45 15 Z" />
        <circle class="rocket__window" cx="45" cy="42" r="7" />
      </svg>
      <span class="toy__cap">ship it</span>
    </button>
  )
}

/** The sun and moon on a taped note: the theme switch. */
export function ThemeToggle() {
  return () => (
    <button
      class="toggle"
      type="button"
      data-theme-toggle=""
      aria-label="Switch to the light theme"
      data-cursor="link"
    >
      <i class="washi washi--sun toggle__tape" aria-hidden="true"></i>
      <span class="toggle__icons" aria-hidden="true">
        <svg class="sun" viewBox="0 0 100 100">
          <g stroke="#facc15" stroke-linecap="round" stroke-width="4">
            <line x1="50" y1="8" x2="50" y2="20" />
            <line x1="50" y1="80" x2="50" y2="92" />
            <line x1="8" y1="50" x2="20" y2="50" />
            <line x1="80" y1="50" x2="92" y2="50" />
            <line x1="20" y1="20" x2="29" y2="29" />
            <line x1="71" y1="71" x2="80" y2="80" />
            <line x1="20" y1="80" x2="29" y2="71" />
            <line x1="71" y1="20" x2="80" y2="29" />
          </g>
          <circle cx="50" cy="50" r="21" fill="#fde047" stroke="#eab308" stroke-width="2.5" />
          <circle cx="43" cy="46" r="2.5" fill="#18181b" />
          <circle cx="57" cy="46" r="2.5" fill="#18181b" />
          <path
            d="M42 53 Q50 61 58 53"
            fill="none"
            stroke="#18181b"
            stroke-linecap="round"
            stroke-width="2.2"
          />
          <circle cx="38" cy="52" r="2" fill="#f43f5e" opacity="0.7" />
          <circle cx="62" cy="52" r="2" fill="#f43f5e" opacity="0.7" />
        </svg>
        <svg class="moon" viewBox="0 0 100 100">
          <path
            d="M62 18 C40 20 24 38 24 60 C24 82 42 98 64 98 C50 90 42 74 42 58 C42 40 50 26 62 18 Z"
            fill="#6366f1"
            stroke="#4338ca"
            stroke-linejoin="round"
            stroke-width="3"
          />
          <path
            d="M38 52 Q43 56 48 52"
            fill="none"
            stroke="#ffffff"
            stroke-linecap="round"
            stroke-width="2.5"
          />
          <circle cx="42" cy="60" r="2.2" fill="#f472b6" />
          <path d="M68 28 L70 23 L72 28 L77 30 L72 32 L70 37 L68 32 L63 30 Z" fill="#facc15" />
          <path d="M78 54 L79 50 L81 54 L84 55 L81 56 L80 60 L78 56 L74 55 Z" fill="#38bdf8" />
        </svg>
      </span>
      <span class="toggle__cap" data-theme-caption="">
        light mode
      </span>
    </button>
  )
}
