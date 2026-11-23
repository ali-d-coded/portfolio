import type { Handle } from 'remix/component'

import type { Project } from '../data/content.ts'
import { routes } from '../routes.ts'
import { Arrow, EmailButton, Layout, type Frame } from '../ui/layout.tsx'
import { SectionHead, Statement, ToolTiles } from '../ui/parts.tsx'
import { toolIcons } from '../ui/tool-icons.ts'

const H1_START = 'Projects in '

export function WorkPage(handle: Handle<{ frame: Frame }>) {
  return () => {
    let { frame } = handle.props
    let { site, projects } = frame
    let name = site?.name ?? ''

    return (
      <Layout
        title={name ? `${name}: projects in backend and full-stack work` : 'Projects'}
        description="Projects from my current and previous companies, with the stack each one runs on."
        pageType="work"
        frame={frame}
      >
        <Hero frame={frame} />
        <ProjectList projects={projects} />
        <Statement
          id="statement"
          kicker="// the short version"
          heading="Five years of SaaS backends"
          lead="Node.js, TypeScript and Bun, with BullMQ and Redis Streams for the queues and Socket.IO for real time."
        />
      </Layout>
    )
  }
}

/** The stack words the headline cycles through: distinct and short. */
function liveWords(projects: Project[]): string[] {
  let words: string[] = []
  for (let item of projects.flatMap((project) => project.stack)) {
    let word = item.trim()
    if (word.length < 2 || word.length > 14 || words.includes(word)) continue
    words.push(word)
    if (words.length === 4) break
  }
  return words
}

function Hero(handle: Handle<{ frame: Frame }>) {
  return () => {
    let { site, projects } = handle.props.frame
    let [first, ...rest] = liveWords(projects)
    let stack = [...new Set(projects.flatMap((project) => project.stack))].slice(0, 4)

    return (
      <section class="hero hero--page" aria-labelledby="hero-h" data-ruler-section="Intro">
        <div class="wrap hero__stack">
          <p class="term" data-enter="">
            <span aria-hidden="true">&gt;</span> ls work/
          </p>
          <h1 id="hero-h" class="hero__title" data-split="" data-hero="">
            {first ? (
              <>
                {H1_START}
                {rest.length > 0 ? (
                  <span class="hl hl--cycle" data-cycle={JSON.stringify(rest)}>
                    {first}.
                  </span>
                ) : (
                  <span class="hl">{first}.</span>
                )}
              </>
            ) : (
              'Projects'
            )}
          </h1>
          <p class="lead" data-enter="">
            {projects.length > 0
              ? 'Projects I built at my current and previous companies, with the stack each one runs on.'
              : 'Projects are listed here once they are published.'}
          </p>
          <div class="btns" data-enter="">
            <EmailButton site={site} />
          </div>
          {projects.length > 0 ? (
            <dl class="facts" data-enter="">
              <div>
                <dt>Projects</dt>
                <dd>{projects.length}</dd>
              </div>
              <div>
                <dt>Newest</dt>
                <dd>{projects[0]!.title}</dd>
              </div>
              {stack.length > 0 ? (
                <div>
                  <dt>Stack</dt>
                  <dd>{stack.join(', ')}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      </section>
    )
  }
}

function ProjectList(handle: Handle<{ projects: Project[] }>) {
  return () => {
    let { projects } = handle.props
    if (projects.length === 0) return null

    return (
      <section class="section" id="projects" aria-labelledby="projects-h" data-ruler-section="Projects">
        <div class="wrap">
          <SectionHead id="projects-h" title="All projects" meta={`// ${projects.length}`}>
            <p class="section-head__lead">Open one for its details and the stack it runs on.</p>
          </SectionHead>
          <ol class="plist" data-project-list="">
            {projects.map((project, index) => (
              <li
                key={project.id}
                data-project={project.slug}
                data-tools={project.stack.join('|')}
                data-reveal=""
              >
                <a
                  class="prow"
                  href={routes.work.show.href({ slug: project.slug })}
                  data-cursor="view"
                  data-preview=""
                >
                  <span class="prow__idx">{String(index + 1).padStart(2, '0')}</span>
                  <span class="prow__main">
                    <span class="prow__title">{project.title}</span>
                    {project.tagline ? <span class="prow__tagline">{project.tagline}</span> : null}
                    {project.summary ? <span class="prow__summary">{project.summary}</span> : null}
                  </span>
                  {toolIcons(project.stack).length > 0 ? (
                    <span class="prow__tools" aria-hidden="true" data-preview-tools="">
                      <ToolTiles names={project.stack} limit={6} size={32} />
                    </span>
                  ) : null}
                  <Arrow />
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>
    )
  }
}
