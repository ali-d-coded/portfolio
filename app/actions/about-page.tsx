import type { Handle } from 'remix/component'

import type { Experience, Site } from '../data/content.ts'
import { routes } from '../routes.ts'
import { paragraphs } from '../ui/blocks.tsx'
import { formatMonth, formatSpan } from '../ui/format.ts'
import { EmailButton, Layout, type Frame } from '../ui/layout.tsx'
import {
  SectionHead,
  Statement,
  ToolTile,
  ToolTiles,
  currentRole,
  earliestStart,
  firstRole,
  studying,
} from '../ui/parts.tsx'
import { toolIcon, toolIcons } from '../ui/tool-icons.ts'

export function AboutPage(handle: Handle<{ frame: Frame }>) {
  return () => {
    let { frame } = handle.props
    let name = frame.site?.name ?? ''

    return (
      <Layout
        title={name ? `${name}: background, experience and education` : 'About'}
        description={
          name
            ? `How ${name} works, every role since the first one, and the degree in progress.`
            : 'Background, experience and education.'
        }
        pageType="about"
        frame={frame}
      >
        <Hero frame={frame} />
        <Story site={frame.site} />
        <History experience={frame.experience} />
        <Statement
          id="statement"
          kicker="// how I work"
          heading="End-to-end ownership, from requirements to release"
          lead="On the Brixton POS contract I owned requirements, development, testing, deployment and performance tuning."
        />
      </Layout>
    )
  }
}

function Hero(handle: Handle<{ frame: Frame }>) {
  return () => {
    let { site, experience, projects } = handle.props.frame
    let since = earliestStart(experience)
    let now = currentRole(experience)
    let first = firstRole(experience)
    let degree = studying(site)
    let hasFacts = Boolean(now || first || degree)

    return (
      <section class="hero hero--page" aria-labelledby="hero-h" data-ruler-section="Intro">
        <div class="wrap hero__stack">
          <p class="term" data-enter="">
            <span aria-hidden="true">&gt;</span> whoami
          </p>
          <h1 id="hero-h" class="hero__title" data-split="" data-hero="">
            {since ? `Engineer since ${formatMonth(since)}` : `About ${site?.name ?? 'me'}`}
          </h1>
          <p class="lead" data-enter="">
            Backend services in Node.js, TypeScript and Bun, plus the React and React Native clients that
            use them.
          </p>
          <div class="btns" data-enter="">
            <EmailButton site={site} />
            {projects.length > 0 ? (
              <a class="btn btn--ghost" href={routes.work.index.href()} data-cursor="link">
                See the case studies
              </a>
            ) : null}
          </div>
          {hasFacts ? (
            <dl class="facts" data-enter="">
              {now ? (
                <div>
                  <dt>Now</dt>
                  <dd>{now.company}</dd>
                </div>
              ) : null}
              {now ? (
                <div>
                  <dt>Role</dt>
                  <dd>{now.role}</dd>
                </div>
              ) : null}
              {first && first !== now ? (
                <div>
                  <dt>First role</dt>
                  <dd>{first.company}</dd>
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
      </section>
    )
  }
}

function Story(handle: Handle<{ site: Site | null }>) {
  return () => {
    let { site } = handle.props
    if (!site) return null
    let story = paragraphs(site.about)
    let education = site.education
    let links = [
      site.linkedinUrl ? { name: 'LinkedIn', href: site.linkedinUrl } : null,
      site.githubUrl ? { name: 'GitHub', href: site.githubUrl } : null,
    ].filter((link) => link !== null)
    if (story.length === 0 && education.length === 0 && links.length === 0) return null

    return (
      <section class="section" id="story" aria-labelledby="story-h" data-ruler-section="Background">
        <div class="wrap">
          <SectionHead id="story-h" title="Background and education" />
          <div class="story">
            {story.length > 0 ? (
              <div class="story__text">
                {story.map((text, index) => (
                  <p key={index} data-reveal="">
                    {text}
                  </p>
                ))}
              </div>
            ) : null}
            <aside class="story__aside">
              {education.length > 0 ? (
                <div class="panel aside-block" data-reveal="">
                  <p class="label">Education</p>
                  {education.map((entry, index) => (
                    <div key={index} class="aside-block__item">
                      <h3>{entry.degree}</h3>
                      <p>{entry.school}</p>
                      <p class="muted">
                        {entry.end ? formatSpan(entry.start, entry.end) : `From ${formatMonth(entry.start)}`}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
              {links.length > 0 ? (
                <div class="panel aside-block" data-reveal="">
                  <p class="label">Elsewhere</p>
                  <div class="aside-block__links">
                    {links.map((link) => {
                      let icon = toolIcon(link.name)
                      return (
                        <a key={link.name} class="chip-link" href={link.href} rel="me" data-cursor="link">
                          {icon ? <ToolTile icon={icon} name={link.name} size={24} /> : null}
                          {link.name}
                        </a>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </section>
    )
  }
}

function History(handle: Handle<{ experience: Experience[] }>) {
  return () => {
    let { experience } = handle.props
    if (experience.length === 0) return null
    let since = earliestStart(experience)

    return (
      <section
        class="section section--band"
        id="experience"
        aria-labelledby="experience-h"
        data-ruler-section="Experience"
      >
        <div class="wrap">
          <SectionHead
            id="experience-h"
            title="Roles and what I shipped in each"
            meta={`// ${experience.length} ${experience.length === 1 ? 'role' : 'roles'}`}
          >
            {since ? (
              <p class="section-head__lead">
                {experience.length} {experience.length === 1 ? 'role' : 'roles'} since {formatMonth(since)}.
              </p>
            ) : null}
          </SectionHead>
          <div class="tl" data-timeline="sticky">
            <nav class="tl__nav" aria-label="Roles">
              <ol>
                {experience.map((entry) => (
                  <li key={entry.id}>
                    <a href={`#role-${entry.id}`} data-timeline-link={entry.id} data-cursor="link">
                      <span class="tl__company">{entry.company}</span>
                      <span class="tl__when">{formatSpan(entry.start, entry.end)}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <ol class="tl__entries">
              {experience.map((entry) => (
                <li
                  key={entry.id}
                  id={`role-${entry.id}`}
                  class="panel tl__entry"
                  data-timeline-entry={entry.id}
                  data-tools={entry.skills.join('|')}
                  data-reveal=""
                >
                  <p class="label">{formatSpan(entry.start, entry.end)}</p>
                  <h3>{entry.company}</h3>
                  <p class="tl__role">{entry.role}</p>
                  {entry.bullets.length > 0 ? (
                    <ul class="tl__bullets">
                      {entry.bullets.map((bullet, index) => (
                        <li key={index}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                  {toolIcons(entry.skills).length > 0 ? (
                    <div class="tl__tools" aria-hidden="true">
                      <ToolTiles names={entry.skills} limit={8} size={24} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    )
  }
}
