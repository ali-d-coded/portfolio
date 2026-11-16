import type { Handle } from 'remix/component'

import type { Media, Project } from '../../data/content.ts'
import { routes } from '../../routes.ts'
import { Blocks, chapters } from '../../ui/blocks.tsx'
import { EmailButton, Layout, type Frame } from '../../ui/layout.tsx'
import { Statement, ToolIconImg } from '../../ui/parts.tsx'
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
            : `${project.title}: a case study${name ? ` by ${name}` : ''}`
        }
        description={
          project.summary ||
          `${project.title}, a case study${name ? ` by ${name}` : ''}, with its stack and architecture.`
        }
        pageType="project"
        frame={frame}
      >
        <Hero frame={frame} project={project} />
        {chapters(blocks, media).length > 0 ? (
          <section
            class="section bg-dots"
            id="story"
            style={{ '--h': blocks.length > 8 ? 2 : 1 }}
            aria-labelledby="story-h"
          >
            <div class="wrap">
              <div class="section-head">
                <h2 id="story-h" data-split="">
                  What I built on {project.title}
                </h2>
              </div>
              <Blocks blocks={blocks} media={media} />
            </div>
          </section>
        ) : null}
        {project.slug === 'eazycrm' ? <Pipeline /> : null}
        {next ? (
          <Statement
            id="next"
            heading={next.title}
            lead={next.tagline ? `The next case study: ${next.tagline.charAt(0).toLowerCase()}${next.tagline.slice(1)}.` : undefined}
          >
            <a
              class="link"
              href={routes.work.show.href({ slug: next.slug })}
              data-cursor="link"
            >
              Read the {next.title} case study
            </a>
          </Statement>
        ) : (
          <Statement id="next" heading="Every case study">
            <a class="link" href={routes.work.index.href()} data-cursor="link">
              See all work
            </a>
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
      <section class="hero hero--word bg-mist" data-enter="" aria-labelledby="hero-h">
        <div class="wrap">
          <div class="hero-text hero__in">
            <h1 id="hero-h" data-split="">
              {project.title}
            </h1>
            <div class="grid hero__foot">
              <div class="span-6">
                {project.summary ? <p class="hero__lead">{project.summary}</p> : null}
                <div class="btn-row">
                  <EmailButton site={frame.site} />
                  <a class="btn btn--secondary" href={routes.work.index.href()} data-cursor="link">
                    See all work
                  </a>
                </div>
              </div>
              {hasFacts ? (
                <dl class="hero__facts hero__facts--col span-5 start-8">
                  {project.tagline ? (
                    <div>
                      <dt>What it is</dt>
                      <dd>{project.tagline}</dd>
                    </div>
                  ) : null}
                  {project.stack.length > 0 ? (
                    <div>
                      <dt>Stack</dt>
                      <dd>{project.stack.join(', ')}</dd>
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
    <section class="section ground-surface" id="pipeline" aria-labelledby="pipeline-h">
      <div class="wrap">
        <div class="section-head">
          <h2 id="pipeline-h" data-split="">
            How a WhatsApp message reaches the inbox
          </h2>
          <p>
            Webhooks from the Meta WhatsApp Cloud API are queued with BullMQ, processed by workers,
            saved to MongoDB and broadcast through Redis Streams and Socket.IO.
          </p>
        </div>
        <ol class="pipeline" data-pipeline="" data-parallax="0.05">
          {STAGES.map((stage, index) => {
            let icon = toolIcon(stage.tool)
            return (
              <li key={stage.name} data-stage={index + 1}>
                {icon ? (
                  <span class="pipeline__node" aria-hidden="true">
                    <ToolIconImg icon={icon} name={stage.tool} size={24} decorative />
                  </span>
                ) : null}
                <span class="pipeline__num">{String(index + 1).padStart(2, '0')}</span>
                <h3>{stage.name}</h3>
                <p>{stage.line}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
