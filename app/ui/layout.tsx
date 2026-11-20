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

function Bar(handle: Handle<{ frame: Frame; pageType: PageType }>) {
  return () => {
    let { frame, pageType } = handle.props
    let { site, projects, hasSkills, experience } = frame
    let current = (...pages: PageType[]) => (pages.includes(pageType) ? 'page' : undefined)

    return (
      <div class="bar">
        <div class="wrap bar__in">
          <Brand site={site} />
          <nav class="bar__nav" aria-label="Main">
            {projects.length > 0 ? (
              <a
                class="navlink"
                href={routes.work.index.href()}
                aria-current={current('work', 'project')}
                data-cursor="link"
              >
                Work
              </a>
            ) : null}
            {hasSkills ? (
              <a class="navlink" href={`${routes.home.href()}#skills`} data-cursor="link">
                Skills
              </a>
            ) : null}
            {experience.length > 0 ? (
              <a class="navlink" href={`${routes.about.href()}#experience`} data-cursor="link">
                Experience
              </a>
            ) : null}
            <a
              class="navlink"
              href={routes.about.href()}
              aria-current={current('about')}
              data-cursor="link"
            >
              About
            </a>
            <a
              class="navlink"
              href={routes.contact.href()}
              aria-current={current('contact')}
              data-cursor="link"
            >
              Contact
            </a>
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
