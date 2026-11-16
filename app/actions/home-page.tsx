import type { Handle } from 'remix/component'

import type { Media, Project, SkillGroup } from '../data/content.ts'
import { routes } from '../routes.ts'
import { formatMonth, formatSpan } from '../ui/format.ts'
import { EmailButton, Layout, type Frame } from '../ui/layout.tsx'
import {
  ProjectVisual,
  ToolIconImg,
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
        title={site?.heroHeadline ? `${site.name}: ${lowerFirst(site.heroHeadline)}` : name}
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

function Hero(handle: Handle<{ frame: Frame }>) {
  return () => {
    let { site, projects, experience } = handle.props.frame
    let now = currentRole(experience)
    let since = earliestStart(experience)
    let stack = selected(projects)[0]?.stack.slice(0, 3) ?? []
    let degree = studying(site)

    return (
      <section class="hero hero--statement bg-halo" data-enter="" aria-labelledby="hero-h">
        <div class="wrap">
          <div class="hero-text hero__in">
            <div>
              <h1 id="hero-h" data-split="">
                {site?.heroHeadline || site?.name || 'Portfolio'}
              </h1>
              {site?.summary ? <p class="hero__lead">{site.summary}</p> : null}
              <div class="btn-row">
                <EmailButton site={site} />
                {projects.length > 0 ? (
                  <a class="btn btn--secondary" href={routes.work.index.href()} data-cursor="link">
                    See the case studies
                  </a>
                ) : null}
              </div>
            </div>
            {now || since || stack.length > 0 || degree ? (
              <dl class="hero__facts">
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
            ) : null}
          </div>
        </div>
      </section>
    )
  }
}

function SelectedWork(handle: Handle<{ projects: Project[]; media: Map<string, Media> }>) {
  return () => {
    let { projects, media } = handle.props
    if (projects.length === 0) return null
    let span = projects.length === 1 ? 'span-12' : 'span-6'
    let figures = projects
      .flatMap((project) =>
        project.figures
          .filter((figure) => figure.value.trim() !== '')
          .map((figure) => ({ ...figure, project: project.title })),
      )
      .slice(0, 3)

    return (
      <section class="section" id="work" aria-labelledby="work-h">
        <div class="wrap">
          <div class="section-head">
            <h2 id="work-h" data-split="">
              Selected work. <span class="muted">The stack each one runs on, and its case study.</span>
            </h2>
          </div>
          <div class="grid" data-project-list="">
            {projects.map((project) => (
              <article
                key={project.id}
                class={`card card--open ${span}`}
                data-project={project.slug}
                data-cursor="view"
              >
                <h3>{project.title}</h3>
                {project.tagline ? <p>{project.tagline}</p> : null}
                <a
                  class="link"
                  href={routes.work.show.href({ slug: project.slug })}
                  data-cursor="view"
                >
                  Read the {project.title} case study
                </a>
                <ProjectVisual project={project} media={media} />
              </article>
            ))}
          </div>
          {figures.length > 0 ? (
            <div class="grid figures" data-moment="counter-rolls">
              {figures.map((figure, index) => (
                <div key={index} class="span-4">
                  <p class="t-stat">{figure.value}</p>
                  <p class="t-small muted">
                    {figure.label} on {figure.project}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
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
      <section
        class="section ground-surface"
        id="skills"
        style={{ '--hm': 2 }}
        aria-labelledby="skills-h"
      >
        <div class="wrap">
          <div class="section-head">
            <h2 id="skills-h" data-split="">
              Skills by area
            </h2>
            <p>The tools I use, from languages to deployment.</p>
          </div>
          <div class="grid skill-groups" data-skills="">
            {groups.map((group) => (
              <div key={group.id} class="skill-group span-4" data-skill-group={group.id}>
                <h3>{group.name}</h3>
                <div class="skill-group__icons" aria-hidden="true">
                  {toolIcons(group.items, 6).map(({ name, icon }) => (
                    <ToolIconImg key={icon.file} icon={icon} name={name} size={24} decorative />
                  ))}
                </div>
                <p class="skill-group__items">{group.items.join(', ')}</p>
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
      <section class="section bg-field" id="experience" aria-labelledby="experience-h">
        <div class="wrap">
          <div class="section-head section-head--row">
            <div>
              <h2 id="experience-h" data-split="">
                Experience, newest first
              </h2>
              {since ? <p>Every role since {formatMonth(since)}.</p> : null}
            </div>
            <a class="link" href={`${routes.about.href()}#experience`} data-cursor="link">
              Read the full history
            </a>
          </div>
          <ol class="grid rail" data-timeline="">
            {experience.map((entry) => (
              <li key={entry.id} class="span-3" data-timeline-entry={entry.id}>
                <p class="t-label muted">{formatSpan(entry.start, entry.end)}</p>
                <h3 class="t-card">{entry.company}</h3>
                <p>{entry.role}</p>
                {toolIcons(entry.skills).length > 0 ? (
                  <div class="rail__icons" aria-hidden="true">
                    {toolIcons(entry.skills, 5).map(({ name, icon }) => (
                      <ToolIconImg key={icon.file} icon={icon} name={name} size={20} decorative />
                    ))}
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
