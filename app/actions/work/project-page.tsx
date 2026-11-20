import type { Handle } from 'remix/component'

import type { Media, Project } from '../../data/content.ts'
import { routes } from '../../routes.ts'
import { Blocks, chapters } from '../../ui/blocks.tsx'
import { Arrow, EmailButton, Layout, type Frame } from '../../ui/layout.tsx'
import { SectionHead, Statement, ToolTile, ToolTiles } from '../../ui/parts.tsx'
import { toolIcon } from '../../ui/tool-icons.ts'

export interface ProjectPageProps {
  frame: Frame
  project: Project
  media: Map<string, Media>
}

export function ProjectPage(handle: Handle<ProjectPageProps>) {
  return () => {
    let { frame, project, media } = handle.props
    let name = frame.site?.name
    // The summary leads the hero; a text block that repeats it word for word is not shown twice.
    let blocks = project.blocks.filter(
      (block) => !(block.type === 'text' && block.text.trim() === project.summary.trim()),
    )
    let index = frame.projects.findIndex((other) => other.id === project.id)
    let next = frame.projects.length > 1 ? frame.projects[(index + 1) % frame.projects.length] : null

    return (
      <Layout
        title={
          project.tagline
            ? `${project.title}: ${project.tagline.charAt(0).toLowerCase()}${project.tagline.slice(1)}`
            : `${project.title}${name ? `: a project by ${name}` : ''}`
        }
        description={
          project.summary ||
          `${project.title}${name ? `, a project by ${name}` : ''}, with its stack and architecture.`
        }
        pageType="project"
        frame={frame}
      >
        <Hero frame={frame} project={project} />
        {chapters(blocks, media).length > 0 ? (
          <section class="section" id="story" aria-labelledby="story-h" data-ruler-section="Story">
            <div class="wrap">
              <SectionHead id="story-h" title={`What I built on ${project.title}`} />
              <Blocks blocks={blocks} media={media} />
            </div>
          </section>
        ) : null}
        {project.slug === 'eazycrm' ? <Pipeline /> : null}
        {next ? (
          <Statement
            id="next"
            kicker="// next project"
            heading={next.title}
            lead={
              next.tagline
                ? `${next.tagline.charAt(0).toUpperCase()}${next.tagline.slice(1)}.`
                : undefined
            }
          >
            <p data-reveal="">
              <a
                class="btn btn--ghost"
                href={routes.work.show.href({ slug: next.slug })}
                data-cursor="link"
              >
                See {next.title}
                <Arrow />
              </a>
            </p>
          </Statement>
        ) : (
          <Statement id="next" kicker="// more" heading="Every project">
            <p data-reveal="">
              <a class="btn btn--ghost" href={routes.work.index.href()} data-cursor="link">
                See all work
                <Arrow />
              </a>
            </p>
          </Statement>
        )}
      </Layout>
    )
  }
}

function Hero(handle: Handle<{ frame: Frame; project: Project }>) {
  return () => {
    let { frame, project } = handle.props
    let hasFacts = Boolean(project.tagline) || project.stack.length > 0

    return (
      <section class="hero hero--page" aria-labelledby="hero-h" data-ruler-section="Intro">
        <div class="wrap hero__stack">
          <p class="term" data-enter="">
            <span aria-hidden="true">&gt;</span> cat work/{project.slug}
          </p>
          <h1 id="hero-h" class="hero__title" data-split="" data-hero="">
            {project.title}
          </h1>
          {project.summary ? (
            <p class="lead" data-enter="">
              {project.summary}
            </p>
          ) : null}
          <div class="btns" data-enter="">
            <EmailButton site={frame.site} />
            <a class="btn btn--ghost" href={routes.work.index.href()} data-cursor="link">
              See all work
            </a>
          </div>
          {hasFacts ? (
            <dl class="facts" data-enter="">
              {project.tagline ? (
                <div>
                  <dt>What it is</dt>
                  <dd>{project.tagline}</dd>
                </div>
              ) : null}
              {project.stack.length > 0 ? (
                <div>
                  <dt>Stack</dt>
                  <dd>
                    <span class="facts__tiles" aria-hidden="true">
                      <ToolTiles names={project.stack} limit={6} size={24} />
                    </span>
                    {project.stack.join(', ')}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      </section>
    )
  }
}

// The EazyCRM message pipeline, in the resume's own order and words.
const STAGES: Array<{ name: string; line: string; tool: string }> = [
  { name: 'Webhook', line: 'Meta WhatsApp Cloud API', tool: 'WhatsApp' },
  { name: 'BullMQ queue', line: 'Queued, fault-tolerant ingestion', tool: 'Redis' },
  { name: 'Worker', line: 'Processes each event', tool: 'Bun' },
  { name: 'MongoDB', line: 'One database per tenant', tool: 'MongoDB' },
  { name: 'Redis Streams', line: 'Tenant-scoped broadcast', tool: 'Redis' },
  { name: 'Socket.IO', line: 'Real-time delivery', tool: 'Socket.IO' },
  { name: 'Inbox', line: 'Agents see only their assigned chats', tool: 'React' },
]

function Pipeline() {
  return () => (
    <section class="section section--band" id="pipeline" aria-labelledby="pipeline-h" data-ruler-section="Pipeline">
      <div class="wrap">
        <SectionHead id="pipeline-h" title="How a WhatsApp message reaches the inbox" meta="// 7 stages">
          <p class="section-head__lead">
            Webhooks from the Meta WhatsApp Cloud API are queued with BullMQ, processed by workers, saved to
            MongoDB and broadcast through Redis Streams and Socket.IO. Pick a stage to follow the message
            from there.
          </p>
        </SectionHead>
        <ol class="pipe" data-pipeline="">
          {STAGES.map((stage, index) => {
            let icon = toolIcon(stage.tool)
            return (
              <li key={stage.name} class="pipe__stage" data-stage={index + 1}>
                {icon ? <ToolTile icon={icon} name={stage.tool} size={48} /> : null}
                <span class="pipe__num">{String(index + 1).padStart(2, '0')}</span>
                <h3>
                  <button type="button" class="pipe__pick" data-cursor="link">
                    {stage.name}
                  </button>
                </h3>
                <p>{stage.line}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
