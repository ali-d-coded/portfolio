import type { Handle, RemixNode } from 'remix/component'

import { Document } from '../actions/document.tsx'
import type { Experience, Project, Site } from '../data/content.ts'
import type { ContentStore } from '../data/store.ts'
import { routes } from '../routes.ts'
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

// The one moment each page type carries (docs/superpowers/plans/copy.md, the deal).
const MOMENTS: Record<PageType, string | undefined> = {
  home: 'counter-rolls',
  work: 'liquid-type',
  project: 'liquid-type',
  about: 'liquid-type',
  contact: 'liquid-type',
  'not-found': undefined,
}

export function Layout(handle: Handle<LayoutProps>) {
  return () => {
    let { title, description, pageType, frame, children } = handle.props

    return (
      <Document
        title={title}
        description={description}
        robots={pageType === 'not-found' ? 'noindex' : 'index, follow'}
        moment={MOMENTS[pageType]}
        pageCss={PAGE_CSS}
      >
        <Nav frame={frame} pageType={pageType} />
        <main id="top" data-page={pageType}>
          {children}
        </main>
        <Footer frame={frame} />
      </Document>
    )
  }
}

/** The main action, worded the same in the nav, every hero and the close. */
export function EmailButton(handle: Handle<{ site: Site | null; arrow?: boolean; xl?: boolean }>) {
  return () => {
    let { site, arrow = true, xl = false } = handle.props
    if (!site?.email) return null
    return (
      <a
        class={xl ? 'btn btn--primary btn--xl' : 'btn btn--primary'}
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
    <svg class="m-arrow" viewBox="0 0 12 12" aria-hidden="true">
      <path class="m-arrow__stem" d="M1 6h8" />
      <path class="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5" />
    </svg>
  )
}

function Logo(handle: Handle<{ site: Site | null }>) {
  return () => (
    <a class="nav__logo" href={routes.home.href()} data-cursor="link">
      <span class="mark" data-mark="dots" aria-hidden="true"></span>
      {handle.props.site?.name ?? ''}
    </a>
  )
}

function Nav(handle: Handle<{ frame: Frame; pageType: PageType }>) {
  return () => {
    let { frame, pageType } = handle.props
    let { site, projects, hasSkills, experience } = frame
    let current = (page: PageType) => (pageType === page ? 'page' : undefined)

    return (
      <header class="nav">
        <div class="wrap nav__bar">
          <a class="skip-link" href="#top">
            Skip to content
          </a>
          <Logo site={site} />
          <nav class="nav__links" aria-label="Main">
            <div class="nav__item">
              <a
                class="nav__link"
                href={routes.work.index.href()}
                aria-current={current('work') ?? current('project')}
                data-cursor="link"
              >
                Work
                {projects.length > 0 ? (
                  <svg class="chev" viewBox="0 0 12 12" aria-hidden="true">
                    <path
                      d="M3 4.5l3 3 3-3"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                ) : null}
              </a>
              {projects.length > 0 ? (
                <div class="nav__menu">
                  <div class="wrap grid">
                    <div class="menu-col span-6">
                      <p class="t-label">Case studies</p>
                      {projects.map((project) => (
                        <a
                          key={project.id}
                          href={routes.work.show.href({ slug: project.slug })}
                          data-cursor="link"
                        >
                          {project.title}
                          {project.tagline ? <span>{project.tagline}</span> : null}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            {hasSkills ? (
              <div class="nav__item">
                <a class="nav__link" href={`${routes.home.href()}#skills`} data-cursor="link">
                  Skills
                </a>
              </div>
            ) : null}
            {experience.length > 0 ? (
              <div class="nav__item">
                <a class="nav__link" href={`${routes.about.href()}#experience`} data-cursor="link">
                  Experience
                </a>
              </div>
            ) : null}
            <div class="nav__item">
              <a
                class="nav__link"
                href={routes.about.href()}
                aria-current={current('about')}
                data-cursor="link"
              >
                About
              </a>
            </div>
            <div class="nav__item">
              <a
                class="nav__link"
                href={routes.contact.href()}
                aria-current={current('contact')}
                data-cursor="link"
              >
                Contact
              </a>
            </div>
          </nav>
          {site?.email ? (
            <div class="nav__actions">
              <EmailButton site={site} arrow={false} />
            </div>
          ) : null}
          <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                d="M2 5h14M2 13h14"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </header>
    )
  }
}

function Footer(handle: Handle<{ frame: Frame }>) {
  return () => {
    let { site, projects, experience } = handle.props.frame
    let now = experience.find((entry) => entry.end === null)
    let year = new Date().getFullYear()

    return (
      <footer class="footer closing footer--statement" id="contact-footer" aria-labelledby="close-h">
        <div class="wrap">
          <div class="closing__cta close--word">
            <div class="section-head--split">
              <div>
                <h2 id="close-h" data-split="">
                  {site ? `Email ${site.name}` : 'Contact'}
                </h2>
                {now ? (
                  <p class="t-lead">
                    {now.role} at {now.company} since {formatMonth(now.start)}.
                  </p>
                ) : null}
              </div>
              <EmailButton site={site} />
            </div>
            {site ? (
              <p class="close__word" aria-hidden="true">
                {site.name}
              </p>
            ) : null}
          </div>
          <div class="closing__links">
            <div class="grid">
              <div class="span-4 stack-4">
                <Logo site={site} />
                {site?.role ? <p class="footer__lede">{site.role}</p> : null}
              </div>
              <div class="span-2 footer__col">
                <h3>Pages</h3>
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
                <div class="span-2 footer__col">
                  <h3>Elsewhere</h3>
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
            <div class="footer__legal">
              <span>
                &copy; {year} {site?.name ?? ''}
              </span>
              <span>Product names and logos are trademarks of their owners.</span>
            </div>
          </div>
        </div>
      </footer>
    )
  }
}

// Page CSS (system.md: only what sits inside a visual and the kit lacks, plus one --p-h per card group).
const PAGE_CSS = `
.tool-tiles { display: flex; flex-wrap: wrap; align-content: center; justify-content: center; gap: var(--s-3); height: 100%; padding: var(--s-5); }
#work .panel { --p-h: 176px; }
#work .panel > .tool-tiles { position: absolute; inset: 0; }
.figures { margin-top: var(--s-8); }
.figures .t-stat { font-family: var(--font-display); font-weight: var(--display-weight); letter-spacing: var(--display-tracking); }
.skill-group h3 { font-family: var(--font-text); font-weight: 500; font-size: var(--t-card); line-height: 1.3; }
.skill-group__icons { display: flex; flex-wrap: wrap; gap: var(--s-2); margin-top: var(--s-3); min-height: 24px; }
.skill-group__items { margin-top: var(--s-3); color: var(--ink); }
.skill-groups { row-gap: var(--s-7); }
.rail { list-style: none; padding: 0; row-gap: var(--s-7); }
.rail > li { position: relative; padding-top: var(--s-6); display: grid; align-content: start; gap: var(--s-2); }
.rail > li::before { content: ""; position: absolute; top: 3px; left: 0; right: calc(-1 * var(--gutter)); height: 1px; background: var(--line); }
.rail > li:last-child::before { right: 0; }
.rail > li::after { content: ""; position: absolute; top: 0; left: 0; width: 8px; height: 8px; border-radius: 50%; background: var(--ink); }
.rail > li:first-child::after { background: var(--accent); }
.rail .rail__icons { display: flex; flex-wrap: wrap; gap: var(--s-2); margin-top: var(--s-2); }
.history { list-style: none; padding: 0; }
.history > li { padding-block: var(--s-6); border-top: 1px solid var(--line); row-gap: var(--s-3); }
.history > li:first-child { border-top: 0; padding-top: 0; }
.history__when { color: var(--muted); }
.history h3 { font-family: var(--font-text); font-weight: 500; font-size: var(--t-card); line-height: 1.3; }
.history ul { padding-left: 1.1em; display: grid; gap: var(--s-2); }
@media (max-width: 1023px) { .history ul { margin-top: var(--s-3); } }
.history li li { color: var(--ink); max-width: 72ch; }
.project-list { list-style: none; padding: 0; }
.project-list > li { border-top: 1px solid var(--line); }
.project-list > li:last-child { border-bottom: 1px solid var(--line); }
.project-row { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); column-gap: var(--gutter); row-gap: var(--s-3); align-items: center; padding-block: var(--s-6); color: inherit; text-decoration: none; }
.project-row__index { grid-column: 1 / span 1; color: var(--muted); font-family: var(--font-mono); font-size: var(--t-small); }
.project-row__main { grid-column: 2 / span 6; display: grid; gap: var(--s-2); }
.project-row__main h3 { font-size: var(--t-h3); line-height: 1.15; }
.project-row__tools { grid-column: 8 / span 4; display: flex; flex-wrap: wrap; gap: var(--s-2); }
.project-row .m-arrow { grid-column: 12 / span 1; justify-self: end; width: 16px; height: 16px; }
.project-row:hover h3, .project-row:focus-visible h3 { text-decoration: underline; text-underline-offset: 6px; text-decoration-thickness: 1px; }
@media (max-width: 1023px) {
  .project-row__index { grid-column: 1 / span 2; }
  .project-row__main { grid-column: 3 / -1; }
  .project-row__tools { grid-column: 3 / -2; }
  .project-row .m-arrow { grid-column: -2 / -1; }
}
.chapters { display: grid; row-gap: var(--s-7); }
.chapter h3 { font-size: var(--t-h3); line-height: 1.2; }
.chapter__body { display: grid; gap: var(--s-4); }
.chapter__body > p { font-size: var(--t-lead); line-height: 1.6; max-width: 62ch; }
.chapter__body figure img { width: 100%; height: auto; border-radius: var(--r-lg); }
.chapter__figures { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: var(--s-6); }
.chapter__figures .t-stat { font-family: var(--font-display); font-weight: var(--display-weight); letter-spacing: var(--display-tracking); }
.contact-list { max-width: 760px; }
.pipeline { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); column-gap: var(--s-4); counter-reset: stage; }
.pipeline > li { position: relative; display: grid; align-content: start; gap: var(--s-2); padding-top: var(--s-8); counter-increment: stage; }
.pipeline > li::before { content: ""; position: absolute; top: 23px; left: 48px; right: calc(-1 * var(--s-4)); height: 1px; background: var(--line-strong, var(--line)); }
.pipeline > li:last-child::before { display: none; }
.pipeline__node { position: absolute; top: 0; left: 0; display: grid; place-items: center; width: 48px; height: 48px; border-radius: var(--r-md); background: var(--card, var(--bg)); box-shadow: inset 0 0 0 1px var(--line); }
.pipeline__node .ic { --ic-s: 24px; }
.pipeline__num { font-family: var(--font-mono); font-size: var(--t-label); color: var(--muted); }
.pipeline h3 { font-family: var(--font-text); font-weight: 500; font-size: var(--t-card); line-height: 1.3; }
.pipeline p { color: var(--ink); }
@media (max-width: 1023px) {
  .pipeline { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: var(--s-6); column-gap: var(--gutter); }
  .pipeline > li { padding-top: 0; padding-left: 64px; min-height: 48px; }
  .pipeline > li::before { display: none; }
}
@media (max-width: 639px) { .pipeline { grid-template-columns: minmax(0, 1fr); row-gap: var(--s-5); } }
.statement .mo-lt__type, .statement h2.statement__line { font-family: var(--font-display); font-weight: var(--display-weight); }
.statement__lead { margin-top: var(--s-6); font-size: var(--t-lead); line-height: 1.6; max-width: 52ch; }
.statement .link { display: inline-block; margin-top: var(--s-5); }
.contact-facts a { color: inherit; }
.story p { font-size: var(--t-lead); line-height: 1.6; max-width: 62ch; }
.story p + p { margin-top: var(--s-5); }
.aside-block + .aside-block { margin-top: var(--s-7); }
.aside-block .ic-chip-row { margin-top: var(--s-3); }
`
