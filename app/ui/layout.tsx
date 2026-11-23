import type { Handle, RemixNode } from 'remix/component'

import { Document } from '../actions/document.tsx'
import type { Experience, Project, Site } from '../data/content.ts'
import type { ContentStore } from '../data/store.ts'
import { routes } from '../routes.ts'
import { ThemeToggle } from './doodles.tsx'
import { firstName, formatMonth } from './format.ts'

export type PageType = 'home' | 'work' | 'project' | 'about' | 'contact' | 'not-found'

/** What the nav and the footer read on every public page. */
export interface Frame {
  site: Site | null
  /** Published projects, in order. */
  projects: Project[]
  hasSkills: boolean
  experience: Experience[]
}

export async function loadFrame(store: ContentStore): Promise<Frame> {
  let [site, projects, skillGroups, experience] = await Promise.all([
    store.getSite(),
    store.listProjects({ publishedOnly: true }),
    store.listSkillGroups(),
    store.listExperience(),
  ])
  return { site, projects, hasSkills: skillGroups.length > 0, experience }
}

export interface LayoutProps {
  title: string
  description: string
  pageType: PageType
  frame: Frame
  children?: RemixNode
}

const PAGE_LABEL: Record<PageType, string> = {
  home: 'Home',
  work: 'Work',
  project: 'Project',
  about: 'About',
  contact: 'Contact',
  'not-found': 'Not found',
}

export function Layout(handle: Handle<LayoutProps>) {
  return () => {
    let { title, description, pageType, frame, children } = handle.props

    return (
      <Document
        title={title}
        description={description}
        robots={pageType === 'not-found' ? 'noindex' : 'index, follow'}
      >
        {pageType === 'home' ? <IntroLoader /> : null}
        <a class="skip-link" href="#top">
          Skip to content
        </a>
        <header class="top">
          <Bar frame={frame} pageType={pageType} />
          <div class="ruler" data-ruler="" aria-hidden="true">
            <span class="ruler__label" data-ruler-label="">
              {PAGE_LABEL[pageType]}
            </span>
            <span class="ruler__mark"></span>
          </div>
        </header>
        <ThemeToggle />
        <ScrollTop />
        <FloatingMenu frame={frame} pageType={pageType} />
        <MailDialog site={frame.site} />
        <main id="top" data-page={pageType}>
          {children}
        </main>
        <Footer frame={frame} />
        <div class="curtain" aria-hidden="true"></div>
        <div class="cursor" aria-hidden="true">
          <span class="cursor__plane">
            <svg viewBox="0 0 52 52" aria-hidden="true">
              <path class="cp__swoosh" d="M33 37 Q40 42 48 38" />
              <path class="cp__flap" d="M27 27 L40 15 L37 33 Z" />
              <path class="cp__wing cp__wing--b" d="M3 3 Q6 23 15 40 L27 27 Z" />
              <path class="cp__wing cp__wing--a" d="M3 3 Q23 6 40 15 L27 27 Z" />
              <path class="cp__fold" d="M3 3 L27 27" />
            </svg>
          </span>
          <span class="cursor__label"></span>
        </div>
      </Document>
    )
  }
}

/** The main action, worded the same in the nav, every hero and the close. */
export function EmailButton(handle: Handle<{ site: Site | null; arrow?: boolean }>) {
  return () => {
    let { site, arrow = true } = handle.props
    if (!site?.email) return null
    return (
      <a
        class="btn btn--primary"
        href={`mailto:${site.email}`}
        data-magnetic=""
        data-cursor="link"
      >
        {emailLabel(site)}
        {arrow ? <Arrow /> : null}
      </a>
    )
  }
}

/** The resume PDF, served unchanged from `public/`. */
export const RESUME_HREF = '/ali-afthab-resume.pdf'

/** An uploaded resume if there is one, otherwise the bundled file. */
export function resumeHref(site: Site | null): string {
  return site?.resumeMediaId ? `/media/${site.resumeMediaId}` : RESUME_HREF
}

/** Open the resume in a new tab. */
export function ResumeButtons(handle: Handle<{ site: Site | null }>) {
  return () => (
    <a class="btn btn--ghost" href={resumeHref(handle.props.site)} target="_blank" rel="noopener" data-cursor="link">
      View resume
    </a>
  )
}

export function emailLabel(site: Site): string {
  return `Email ${firstName(site.name)}`
}

export function Arrow() {
  return () => (
    <svg class="arrow" viewBox="0 0 12 12" aria-hidden="true">
      <path class="arrow__stem" d="M1 6h8" />
      <path class="arrow__head" d="M4.5 2.5 8 6l-3.5 3.5" />
    </svg>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function Brand(handle: Handle<{ site: Site | null }>) {
  return () => {
    let { site } = handle.props
    return (
      <a class="brand" href={routes.home.href()} data-cursor="link">
        <span class="brand__mark" aria-hidden="true">
          {site ? initials(site.name) : ''}
        </span>
        <span class="brand__name">{site?.name ?? ''}</span>
        {site?.role ? (
          <span class="brand__role">
            <span aria-hidden="true">//</span> {site.role.split('|')[0]!.trim()}
          </span>
        ) : null}
      </a>
    )
  }
}

interface NavItem {
  label: string
  href: string
  current: boolean
}

/** The nav, shared by the top bar and the floating menu on small screens. */
function navItems(frame: Frame, pageType: PageType): NavItem[] {
  let items: NavItem[] = []
  if (frame.projects.length > 0) {
    items.push({ label: 'Work', href: routes.work.index.href(), current: pageType === 'work' || pageType === 'project' })
  }
  if (frame.hasSkills) items.push({ label: 'Skills', href: `${routes.home.href()}#skills`, current: false })
  items.push({ label: 'About', href: routes.about.href(), current: pageType === 'about' })
  items.push({ label: 'Contact', href: routes.contact.href(), current: pageType === 'contact' })
  return items
}

function Bar(handle: Handle<{ frame: Frame; pageType: PageType }>) {
  return () => {
    let { frame, pageType } = handle.props
    let { site } = frame

    return (
      <div class="bar">
        <div class="wrap bar__in">
          <Brand site={site} />
          <nav class="bar__nav" aria-label="Main">
            {navItems(frame, pageType).map((item) => (
              <a
                key={item.label}
                class="navlink"
                href={item.href}
                aria-current={item.current ? 'page' : undefined}
                data-cursor="link"
              >
                {item.label}
              </a>
            ))}
          </nav>
          {site?.email ? (
            <div class="bar__cta">
              <EmailButton site={site} arrow={false} />
            </div>
          ) : null}
        </div>
      </div>
    )
  }
}

/** On small screens the nav lives in a floating button that blooms open into the same links. */
function FloatingMenu(handle: Handle<{ frame: Frame; pageType: PageType }>) {
  return () => {
    let { frame, pageType } = handle.props
    return (
      <div class="fmenu" data-menu="">
        <nav class="fmenu__list" id="fmenu-list" aria-label="Menu" data-menu-list="">
          {navItems(frame, pageType).map((item) => (
            <a
              key={item.label}
              class="fmenu__item"
              href={item.href}
              aria-current={item.current ? 'page' : undefined}
              data-menu-item=""
              tabIndex={-1}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <button class="fmenu__btn" type="button" aria-expanded="false" aria-controls="fmenu-list" aria-label="Open the menu" data-menu-button="">
          <span class="fmenu__bars" aria-hidden="true">
            <i></i>
            <i></i>
            <i></i>
          </span>
        </button>
      </div>
    )
  }
}

/** Appears after scrolling down; takes the visitor back to the top. */
function ScrollTop() {
  return () => (
    <button class="totop" type="button" aria-label="Back to the top" data-to-top="" data-cursor="link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    </button>
  )
}

function Footer(handle: Handle<{ frame: Frame }>) {
  return () => {
    let { frame } = handle.props
    let { site, projects, experience } = frame
    let now = experience[0] ?? null
    let year = new Date().getFullYear()

    return (
      <footer class="foot" id="contact-footer" aria-labelledby="close-h" data-ruler-section="Get in touch">
        <div class="wrap">
          <div class="panel foot__cta" data-reveal="">
            <i class="washi washi--cta" aria-hidden="true"></i>
            <p class="label">// get in touch</p>
            <h2 id="close-h" data-split="">
              {site ? `Email ${site.name}` : 'Contact'}
            </h2>
            {now ? (
              <p class="lead">
                {now.role} at {now.company} since {formatMonth(now.start)}.
              </p>
            ) : null}
            <div class="btns">
              <EmailButton site={site} />
              <ResumeButtons site={site} />
            </div>
          </div>
          {site ? (
            <p class="foot__word" aria-hidden="true" data-slide="">
              {site.name}
            </p>
          ) : null}
          <div class="foot__links">
            <div class="foot__col">
              <Brand site={site} />
              {site?.role ? <p class="foot__lede">{site.role}</p> : null}
            </div>
            <div class="foot__col">
              <h3 class="label">Pages</h3>
              <ul>
                {projects.length > 0 ? (
                  <li>
                    <a href={routes.work.index.href()} data-cursor="link">
                      Work
                    </a>
                  </li>
                ) : null}
                <li>
                  <a href={routes.about.href()} data-cursor="link">
                    About
                  </a>
                </li>
                <li>
                  <a href={routes.contact.href()} data-cursor="link">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            {site?.linkedinUrl || site?.githubUrl || site?.instagramUrl ? (
              <div class="foot__col">
                <h3 class="label">Elsewhere</h3>
                <ul>
                  {site.linkedinUrl ? (
                    <li>
                      <a href={site.linkedinUrl} rel="me" data-cursor="link">
                        LinkedIn
                      </a>
                    </li>
                  ) : null}
                  {site.githubUrl ? (
                    <li>
                      <a href={site.githubUrl} rel="me" data-cursor="link">
                        GitHub
                      </a>
                    </li>
                  ) : null}
                  {site.instagramUrl ? (
                    <li>
                      <a href={site.instagramUrl} rel="me" data-cursor="link">
                        Instagram
                      </a>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>
          <div class="foot__legal">
            <span>
              &copy; {year} {site?.name ?? ''}
            </span>
            <span>Product names and logos are trademarks of their owners.</span>
          </div>
        </div>
      </footer>
    )
  }
}

/** The paper plane outline used on the send button and the stamp. */
function PlaneIcon(handle: Handle<{ class?: string }>) {
  return () => (
    <svg class={handle.props.class ?? 'mb__icon'} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21.5 2.5 10.2 13.8" />
      <path d="M21.5 2.5 14.6 21.5l-4.4-7.7L2.5 9.4z" />
    </svg>
  )
}

/**
 * The message form, opened by any email link on the page. It is a full-screen dialog so the letter can fold
 * and fly across the whole page. Without script the links are plain `mailto:` links and this stays closed.
 */
function MailDialog(handle: Handle<{ site: Site | null }>) {
  return () => {
    let { site } = handle.props
    if (!site?.email) return null
    let owner = firstName(site.name)
    return (
      <dialog class="mailbox" data-mailbox="" data-owner={owner} data-mark={initials(site.name)} aria-labelledby="mb-title" data-lenis-prevent="">
        <div class="mb__scrim" data-mb-close=""></div>
        <div class="mb__stage">
          <div class="mb__card panel" data-mb-card="">
            <form class="mb__form" method="post" action={routes.mail.href()} novalidate data-mb-form="">
              <div class="mb__fields" data-mb-fields="">
              <div class="mb__head">
                <p class="label" id="mb-title">
                  {`// new message to ${owner}`}
                </p>
                <button class="mb__x" type="button" aria-label="Close the form" data-mb-close="" data-cursor="link">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
              <div class="mb__row">
                <div class="mb__field">
                  <label for="mb-name">Your name</label>
                  <input id="mb-name" name="name" type="text" autoComplete="name" maxLength={80} required />
                  <span class="mb__err" data-mb-err="name"></span>
                </div>
                <div class="mb__field">
                  <label for="mb-email">Your email</label>
                  <input id="mb-email" name="email" type="email" autoComplete="email" maxLength={120} required />
                  <span class="mb__err" data-mb-err="email"></span>
                </div>
              </div>
              <div class="mb__field">
                <label for="mb-message">Message</label>
                <textarea id="mb-message" name="message" rows={5} maxLength={5000} required></textarea>
                <span class="mb__err" data-mb-err="message"></span>
              </div>
              <div class="mb__hp" aria-hidden="true">
                <label for="mb-website">Website</label>
                <input id="mb-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              <div class="mb__fail" role="alert" data-mb-fail="" hidden></div>
              </div>
              <div class="mb__foot">
                <span class="mb__hint" data-mb-hint="">
                  Ctrl Enter to send
                </span>
                <button class="btn btn--primary mb__send" type="submit" data-mb-send="" data-cursor="link">
                  <span class="mb__send-label" data-mb-label="">
                    Send
                  </span>
                  <PlaneIcon />
                  <i class="mb__spin" aria-hidden="true"></i>
                </button>
              </div>
            </form>
            <div class="mb__done" data-mb-done="" hidden>
              <div class="mb__done-head">
                <p class="mb__sent">
                  Sent to <span class="brand__mark" aria-hidden="true">{initials(site.name)}</span> {owner}
                </p>
                <span class="mb__time" data-mb-time=""></span>
              </div>
              <p class="mb__copy">{`${owner} reads every message personally, usually within a day, and replies from the address you gave.`}</p>
              <div class="mb__again">
                <button class="btn btn--primary" type="button" data-mb-again="" data-cursor="link">
                  Write another
                </button>
                <button class="btn btn--ghost" type="button" data-mb-edit="" data-cursor="link">
                  Edit and resend
                </button>
              </div>
            </div>
          </div>
          <div class="mb__letter" data-mb-letter="" aria-hidden="true">
            <div class="mb__sheet" data-mb-sheet="">
            <i class="mb__flap mb__flap--l"></i>
            <i class="mb__flap mb__flap--r"></i>
            <div class="mb__paper">
              <div class="mb__date" data-mb-date=""></div>
              <div class="mb__text" data-mb-text=""></div>
              <div class="mb__stamp">
                <PlaneIcon class="mb__stamp-icon" />
                <span>Air mail</span>
              </div>
              <svg class="mb__postmark" viewBox="0 0 120 56" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
                <path d="M2 14c8-6 12 6 20 0s12 6 20 0 12 6 20 0M2 26c8-6 12 6 20 0s12 6 20 0 12 6 20 0M2 38c8-6 12 6 20 0s12 6 20 0 12 6 20 0" />
                <circle cx="90" cy="28" r="22" />
                <circle cx="90" cy="28" r="15" />
              </svg>
            </div>
            </div>
          </div>
          <svg class="mb__plane" data-mb-plane="" viewBox="0 0 100 100" aria-hidden="true">
            <polygon points="0,0 40,50 0,100" class="mb__pl mb__pl--tail" />
            <polygon points="0,0 100,50 40,50" class="mb__pl mb__pl--up" />
            <polygon points="0,100 100,50 40,50" class="mb__pl mb__pl--down" />
          </svg>
        </div>
        <svg class="mb__trail" data-mb-trail="" aria-hidden="true">
          <path class="mb__glow" data-mb-glow="" />
          <path class="mb__line" data-mb-line="" />
        </svg>
      </dialog>
    )
  }
}

/**
 * The loading reveal on the first visit to the home page in a tab: a rocket launch. The desk counts down from
 * five on the pad, the rocket lights and lifts off, and flies a loop around the whole window trailing fire while
 * the cover breaks into pixels and the page is revealed. A closed or new tab counts as a first visit. The boot
 * script in the document head decides whether it plays.
 */
function IntroLoader() {
  return () => (
    <div class="opening" data-intro="" aria-hidden="true">
      <canvas class="opening__fire" data-intro-fire=""></canvas>
      <div class="opening__center" data-intro-center="">
        <p class="opening__label" data-intro-label="">
          T-minus
        </p>
        <p class="opening__digit" data-intro-digit="">
          5
        </p>
        <div class="opening__slot" data-intro-slot="">
          <i class="opening__ground"></i>
        </div>
        <ul class="opening__log">
          <li class="opening__line">fuel loaded</li>
          <li class="opening__line">stickers taped down</li>
          <li class="opening__line">toys strapped in</li>
          <li class="opening__line opening__line--go">ignition</li>
        </ul>
      </div>
      <svg class="opening__rocket" data-intro-rocket="" viewBox="0 0 90 140" aria-hidden="true">
        <g class="rk__flame" data-intro-flame="">
          <path class="rk__fire rk__fire--outer" d="M33 72 Q45 140 57 72 Z" />
          <path class="rk__fire rk__fire--mid" d="M37 72 Q45 116 53 72 Z" />
          <path class="rk__fire rk__fire--core" d="M41 72 Q45 98 49 72 Z" />
        </g>
        <path class="rk__fin" d="M30 62 L18 72 L32 75 Z" />
        <path class="rk__fin" d="M60 62 L72 72 L58 75 Z" />
        <path class="rk__body" d="M45 15 C33 30 31 55 31 72 L59 72 C59 55 57 30 45 15 Z" />
        <circle class="rk__window" cx="45" cy="42" r="7" />
      </svg>
      <div class="opening__px" data-intro-px=""></div>
    </div>
  )
}
