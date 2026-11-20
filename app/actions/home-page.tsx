import type { Handle } from 'remix/component'

import type { Media, Project, SkillGroup } from '../data/content.ts'
import { routes } from '../routes.ts'
import { Desk } from '../ui/doodles.tsx'
import { formatMonth, formatSpan, splitTail } from '../ui/format.ts'
import { Arrow, EmailButton, Layout, ResumeButtons, type Frame } from '../ui/layout.tsx'
import {
  ProjectVisual,
  SectionHead,
  ToolTile,
  ToolTiles,
  currentRole,
  earliestStart,
  lowerFirst,
  studying,
} from '../ui/parts.tsx'
import { toolIcons } from '../ui/tool-icons.ts'

export interface HomePageProps {
  frame: Frame
  skillGroups: SkillGroup[]
  media: Map<string, Media>
}

export function HomePage(handle: Handle<HomePageProps>) {
  return () => {
    let { frame, skillGroups, media } = handle.props
    let { site } = frame
    let name = site?.name ?? 'Portfolio'

    return (
      <Layout
        title={pageTitle(site)}
        description={site?.summary ?? ''}
        pageType="home"
        frame={frame}
      >
        <Hero frame={frame} />
        <SelectedWork projects={selected(frame.projects)} media={media} />
        <Skills groups={skillGroups} />
        <ExperienceRail frame={frame} />
      </Layout>
    )
  }
}

/** Up to two featured projects; without any featured, the first two published. */
function selected(projects: Project[]): Project[] {
  let featured = projects.filter((project) => project.featured)
  return (featured.length > 0 ? featured : projects).slice(0, 2)
}

/** The sticky note on the desk. */
const DESK_NOTE =
  '5 years designing and shipping scalable multi-tenant SaaS platforms and high-volume, event-driven backend systems. Strong record of end-to-end ownership, performance optimization, and system design.'

/** The headline on one line; a headline that already starts with the name is not given the name twice. */
function pageTitle(site: Frame['site']): string {
  if (!site?.heroHeadline) return site?.name ?? 'Portfolio'
  let flat = site.heroHeadline.replace(/\s*\n\s*/g, ' ').trim()
  return flat.toLowerCase().startsWith(site.name.toLowerCase()) ? flat : `${site.name}: ${lowerFirst(flat)}`
}

function Hero(handle: Handle<{ frame: Frame }>) {
  return () => {
    let { site, projects, experience } = handle.props.frame
    let now = currentRole(experience)
    let since = earliestStart(experience)
    let chosen = selected(projects)
    let stack = chosen[0]?.stack.slice(0, 3) ?? []
    let headline = site?.heroHeadline || site?.name || 'Portfolio'
    // The headline is set one line per line of text; the last line has its last two words picked out.
    let lines = headline.split('\n').map((line) => line.trim()).filter(Boolean)

    return (
      <section class="hero" aria-labelledby="hero-h" data-ruler-section="Intro">
        <div class="wrap hero__grid">
          <div class="hero__text">
            {site?.role ? (
              <p class="term" data-enter="">
                <span aria-hidden="true">&gt;</span> {site.role}
              </p>
            ) : null}
            <h1 id="hero-h" class="hero__title" data-split="" data-hero="">
              {lines.map((line, index) => {
                if (index < lines.length - 1 || lines.length === 1) {
                  let tail = lines.length === 1 ? splitTail(line) : null
                  return (
                    <span key={index} class="hero__line">
                      {tail ? (
                        <>
                          {tail.head} <span class="hl">{tail.tail}</span>
                        </>
                      ) : (
                        line
                      )}
                    </span>
                  )
                }
                let words = line.split(/\s+/)
                let split = words.length >= 3 ? words.length - 2 : 0
                return (
                  <span key={index} class="hero__line">
                    {split > 0 ? `${words.slice(0, split).join(' ')} ` : null}
                    <span class="hl">{words.slice(split).join(' ')}</span>
                  </span>
                )
              })}
            </h1>
            {site?.summary ? (
              <p class="lead" data-enter="">
                {site.summary}
              </p>
            ) : null}
            <div class="btns" data-enter="">
              <EmailButton site={site} />
              <ResumeButtons site={site} />
              {projects.length > 0 ? (
                <a class="btn btn--ghost" href={routes.work.index.href()} data-cursor="link">
                  See the projects
                </a>
              ) : null}
            </div>
          </div>
          <Desk
            variant="home"
            site={site}
            now={now}
            since={since}
            stack={stack}
            degree={studying(site)}
            note={DESK_NOTE}
          />
        </div>
      </section>
    )
  }
}

function SelectedWork(handle: Handle<{ projects: Project[]; media: Map<string, Media> }>) {
  return () => {
    let { projects, media } = handle.props
    if (projects.length === 0) return null

    return (
      <section class="section" id="work" aria-labelledby="work-h" data-ruler-section="Work">
        <div class="wrap">
          <SectionHead id="work-h" title="Selected work" meta={`// ${projects.length}`}>
            <p class="section-head__lead">Built at my current and previous companies, with the stack each one runs on.</p>
          </SectionHead>
          <div class="projects" data-project-list="">
            {projects.map((project, index) => {
              let figures = project.figures.filter((figure) => figure.value.trim() !== '').slice(0, 3)
              return (
                <article
                  key={project.id}
                  class="panel project"
                  data-project={project.slug}
                  data-tools={project.stack.join('|')}
                  data-reveal=""
                  data-cursor="view"
                >
                  <p class="label project__index">// {String(index + 1).padStart(2, '0')}</p>
                  <h3>{project.title}</h3>
                  {project.tagline ? <p class="project__tagline">{project.tagline}</p> : null}
                  <ProjectVisual project={project} media={media} />
                  {figures.length > 0 ? (
                    <ul class="figs">
                      {figures.map((figure, figureIndex) => (
                        <li key={figureIndex}>
                          <span class="fig__value" data-count="">
                            {figure.value}
                          </span>
                          <span class="fig__label">{figure.label}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <a
                    class="btn btn--ghost project__link"
                    href={routes.work.show.href({ slug: project.slug })}
                    data-cursor="view"
                  >
                    See {project.title}
                    <Arrow />
                  </a>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    )
  }
}

function Skills(handle: Handle<{ groups: SkillGroup[] }>) {
  return () => {
    let groups = handle.props.groups.filter((group) => group.items.length > 0)
    if (groups.length === 0) return null

    return (
      <section class="section section--band" id="skills" aria-labelledby="skills-h" data-ruler-section="Skills">
        <div class="wrap">
          <SectionHead id="skills-h" title="Skills by area" meta={`// ${groups.length} groups`}>
            <p class="section-head__lead">
              The tools I use, from languages to deployment. Pick a group to see which projects and roles
              used it.
            </p>
          </SectionHead>
          <p class="skills__status" data-skills-status="" aria-live="polite">
            No group selected.
          </p>
          <div class="skills" data-skills="">
            {groups.map((group) => (
              <div
                key={group.id}
                class="panel skill"
                data-skill-group={group.id}
                data-tools={group.items.join('|')}
                data-reveal=""
              >
                <h3>
                  <button type="button" class="skill__pick" aria-pressed="false" data-cursor="link">
                    {group.name}
                  </button>
                </h3>
                {toolIcons(group.items).length > 0 ? (
                  <div class="skill__icons" aria-hidden="true">
                    {toolIcons(group.items, 6).map(({ name, icon }) => (
                      <ToolTile key={icon.file} icon={icon} name={name} size={24} />
                    ))}
                  </div>
                ) : null}
                <ul class="chips">
                  {group.items.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }
}

function ExperienceRail(handle: Handle<{ frame: Frame }>) {
  return () => {
    let { experience } = handle.props.frame
    if (experience.length === 0) return null
    let since = earliestStart(experience)

    return (
      <section class="section" id="experience" aria-labelledby="experience-h" data-ruler-section="Experience">
        <div class="wrap">
          <SectionHead
            id="experience-h"
            title="Experience, newest first"
            meta={since ? `// since ${formatMonth(since)}` : undefined}
          >
            <p class="section-head__lead">
              {since ? `Every role since ${formatMonth(since)}. ` : ''}
              <a class="link" href={`${routes.about.href()}#experience`} data-cursor="link">
                Read the full history
              </a>
            </p>
          </SectionHead>
          <ol class="rail" data-timeline="rail">
            {experience.map((entry) => (
              <li
                key={entry.id}
                class="rail__item"
                data-timeline-entry={entry.id}
                data-tools={entry.skills.join('|')}
                data-reveal=""
              >
                <p class="label">{formatSpan(entry.start, entry.end)}</p>
                <h3>{entry.company}</h3>
                <p class="rail__role">{entry.role}</p>
                {toolIcons(entry.skills).length > 0 ? (
                  <div class="rail__tools" aria-hidden="true">
                    <ToolTiles names={entry.skills} limit={5} size={24} />
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>
    )
  }
}
