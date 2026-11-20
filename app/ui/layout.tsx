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
        <main id="top" data-page={pageType}>
          {children}
        </main>
        <Footer frame={frame} />
        <div class="curtain" aria-hidden="true"></div>
        <div class="cursor" aria-hidden="true">
          <i class="cursor__ring"></i>
          <i class="cursor__dot"></i>
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
            {site?.linkedinUrl || site?.githubUrl ? (
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
