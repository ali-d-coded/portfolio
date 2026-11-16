import type { Handle } from 'remix/component'

import type { Project } from '../data/content.ts'
import { routes } from '../routes.ts'
import { Arrow, EmailButton, Layout, type Frame } from '../ui/layout.tsx'
import { Statement, ToolIconImg } from '../ui/parts.tsx'
import { toolIcons } from '../ui/tool-icons.ts'

const H1_START = 'Case studies in '
const H1_MAX = 28

export function WorkPage(handle: Handle<{ frame: Frame }>) {
  return () => {
    let { frame } = handle.props
    let { site, projects } = frame
    let name = site?.name ?? ''

    return (
      <Layout
        title={name ? `${name}: case studies in backend and full-stack work` : 'Case studies'}
        description="Every published case study, with the stack each project runs on and a link to its architecture."
        pageType="work"
        frame={frame}
      >
        <Hero frame={frame} />
        <ProjectList projects={projects} />
        <Statement
          id="statement"
          ground="bg-dusk"
          heading="Five years of SaaS backends"
          lead="Node.js, TypeScript and Bun, with BullMQ and Redis Streams for the queues and Socket.IO for real time."
        />
      </Layout>
    )
  }
}

/** The stack words the headline can end on: distinct, short enough for the hero's 28 characters. */
function liveWords(projects: Project[]): string[] {
  let words: string[] = []
  for (let item of projects.flatMap((project) => project.stack)) {
    let word = `${item.trim()}.`
    if (word.length < 2 || words.includes(word)) continue
    if (H1_START.length + word.length > H1_MAX) continue
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
      <section class="hero hero--word bg-topglow" data-enter="" aria-labelledby="hero-h">
        <div class="wrap">
          <div class="hero-text hero__in">
            <h1 id="hero-h" data-split="">
              {first ? (
                <>
                  {H1_START}
                  {rest.length > 0 ? (
                    <span class="ly-word" data-ly-word={JSON.stringify(rest)}>
                      {first}
                    </span>
                  ) : (
                    first
                  )}
                </>
              ) : (
                'Case studies'
              )}
            </h1>
            <div class="grid hero__foot">
              <div class="span-6">
                <p class="hero__lead">
                  {projects.length > 0
                    ? 'Each project below lists its stack and links to a case study with its architecture.'
                    : 'Case studies are listed here once they are published.'}
                </p>
                <div class="btn-row">
                  <EmailButton site={site} />
                </div>
              </div>
              {projects.length > 0 ? (
                <dl class="hero__facts hero__facts--col span-5 start-8">
                  <div>
                    <dt>Case studies</dt>
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
          </div>
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
      <section class="section" id="projects" aria-labelledby="projects-h">
        <div class="wrap">
          <div class="section-head">
            <h2 id="projects-h" data-split="">
              All projects
            </h2>
            <p>Open one for its architecture and the stack it runs on.</p>
          </div>
          <ol class="project-list" data-project-list="">
            {projects.map((project, index) => (
              <li key={project.id} data-project={project.slug}>
                <a
                  class="project-row"
                  href={routes.work.show.href({ slug: project.slug })}
                  data-cursor="view"
                >
                  <span class="project-row__index">{String(index + 1).padStart(2, '0')}</span>
                  <div class="project-row__main">
                    <h3>{project.title}</h3>
                    {project.tagline ? <span>{project.tagline}</span> : null}
                  </div>
                  {toolIcons(project.stack).length > 0 ? (
                    <div class="project-row__tools" aria-hidden="true">
                      {toolIcons(project.stack, 6).map(({ name, icon }) => (
                        <span key={icon.file} class="ic-tile">
                          <ToolIconImg icon={icon} name={name} size={24} decorative />
                        </span>
                      ))}
                    </div>
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
