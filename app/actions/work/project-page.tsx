import type { Handle } from 'remix/component'

import type { Media, Project } from '../../data/content.ts'
import { routes } from '../../routes.ts'
import { Blocks, chapters } from '../../ui/blocks.tsx'
import { displayUrl } from '../../ui/format.ts'
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
        <Gains project={project} />
        <Route project={project} />
        <Screens project={project} />
        {chapters(blocks, media).length > 0 ? (
          <section class="section" id="story" aria-labelledby="story-h" data-ruler-section="Story">
            <div class="wrap">
              <SectionHead id="story-h" title={project.stages?.length ? 'Under the hood' : `What I built on ${project.title}`} />
              <Blocks blocks={blocks} media={media} />
            </div>
          </section>
        ) : null}
        <LivePreview project={project} />
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

/** The live site: a clickable browser-window preview with its screenshot, opening the real site in a new tab. */
function LivePreview(handle: Handle<{ project: Project }>) {
  return () => {
    let { project } = handle.props
    if (!project.liveUrl) return null
    let host = displayUrl(project.liveUrl)
    return (
      <section class="section section--tight" id="live" aria-label="Live site" data-ruler-section="Live site">
        <div class="wrap">
          <a
            class="live"
            href={project.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-cursor="view"
            data-reveal=""
          >
            <span class="live__bar" aria-hidden="true">
              <i></i>
              <i></i>
              <i></i>
              <span class="live__url">{host}</span>
            </span>
            {project.previewImage ? (
              <img class="live__img" src={project.previewImage} alt={`Screenshot of ${host}`} loading="lazy" />
            ) : null}
            <span class="live__cta">
              Visit {host}
              <Arrow />
            </span>
          </a>
          {project.liveNote ? <p class="live__note">{project.liveNote}</p> : null}
        </div>
      </section>
    )
  }
}

/** What a business gets, set as plain divided rows: the first thing a client wants to know. */
function Gains(handle: Handle<{ project: Project }>) {
  return () => {
    let { project } = handle.props
    let gains = project.gains ?? []
    if (gains.length === 0) return null
    return (
      <section class="section" id="gets" aria-labelledby="gets-h" data-ruler-section="What you get">
        <div class="wrap">
          <SectionHead id="gets-h" title={`What a business gets from ${project.title}`} />
          <ul class="gets">
            {gains.map((gain) => (
              <li key={gain.title} data-reveal="">
                <h3>{gain.title}</h3>
                <p>{gain.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    )
  }
}

/**
 * The route one message takes through the product. The desk's paper plane carries it from stop to stop, and each
 * stop says in plain words what it protects. Without script every stop shows its sentence.
 */
function Route(handle: Handle<{ project: Project }>) {
  return () => {
    let { project } = handle.props
    let stages = project.stages ?? []
    if (stages.length < 2) return null
    return (
      <section class="section section--band" id="route" aria-labelledby="route-h" data-ruler-section="Route">
        <div class="wrap">
          <SectionHead id="route-h" title="Follow one message from WhatsApp to the right inbox">
            <p class="section-head__lead">
              A customer writes. These are the stops before an agent sees the message, and what each one protects.
            </p>
          </SectionHead>
          <div class="route" data-route="" style={`--n: ${stages.length}`}>
            <ol class="route__stops">
              {stages.map((stage, index) => {
                let icon = stage.tool ? toolIcon(stage.tool) : null
                return (
                  <li key={stage.name} class="route__stop" data-stop={index}>
                    <span class="route__node" aria-hidden="true">
                      {icon ? <ToolTile icon={icon} name={stage.tool} size={32} /> : <i class="route__dot"></i>}
                    </span>
                    <h3>
                      <button type="button" class="route__pick" data-cursor="link" data-benefit={stage.benefit}>
                        {stage.name}
                      </button>
                    </h3>
                    <span class="route__line">{stage.line}</span>
                    <p class="route__why">{stage.benefit}</p>
                  </li>
                )
              })}
            </ol>
            <span class="route__trail" aria-hidden="true"></span>
            <span class="route__plane" aria-hidden="true">
              <svg viewBox="0 0 52 52">
                <path class="cp__flap" d="M27 27 L40 15 L37 33 Z" />
                <path class="cp__wing cp__wing--b" d="M3 3 Q6 23 15 40 L27 27 Z" />
                <path class="cp__wing cp__wing--a" d="M3 3 Q23 6 40 15 L27 27 Z" />
                <path class="cp__fold" d="M3 3 L27 27" />
              </svg>
            </span>
            <p class="route__says" data-route-says="" aria-live="polite">
              <strong>{stages[0]!.name}</strong>
              <span>{stages[0]!.benefit}</span>
            </p>
          </div>
          <p>
            <button type="button" class="btn btn--ghost route__replay" data-route-replay="" data-cursor="link">
              Send the message again
            </button>
          </p>
        </div>
      </section>
    )
  }
}

/** The apps, as the owner supplied them: framed screenshots. With none supplied the section does not render. */
function Screens(handle: Handle<{ project: Project }>) {
  return () => {
    let { project } = handle.props
    let screens = project.screens ?? []
    if (screens.length === 0) return null
    return (
      <section class="section" id="screens" aria-labelledby="screens-h" data-ruler-section="The apps">
        <div class="wrap">
          <SectionHead id="screens-h" title={`The ${project.title} apps`} />
          <div class="shots">
            {screens.map((screen) => (
              <figure key={screen.image} class={`shot shot--${screen.device}`} data-reveal="">
                {screen.device === 'mobile' ? null : (
                  <span class="shot__bar" aria-hidden="true">
                    <i></i>
                    <i></i>
                    <i></i>
                  </span>
                )}
                <img class="shot__img" src={screen.image} alt={`${screen.label || screen.device} screen of ${project.title}`} loading="lazy" />
                {screen.label ? <figcaption>{screen.label}</figcaption> : null}
              </figure>
            ))}
          </div>
        </div>
      </section>
    )
  }
}
