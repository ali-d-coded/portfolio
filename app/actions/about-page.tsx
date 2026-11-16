import type { Handle } from 'remix/component'

import type { Experience, Site } from '../data/content.ts'
import { routes } from '../routes.ts'
import { paragraphs } from '../ui/blocks.tsx'
import { formatMonth, formatSpan } from '../ui/format.ts'
import { EmailButton, Layout, type Frame } from '../ui/layout.tsx'
import {
  Statement,
  ToolIconImg,
  currentRole,
  earliestStart,
  firstRole,
  studying,
} from '../ui/parts.tsx'
import { toolIcon } from '../ui/tool-icons.ts'

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
      <section class="hero hero--word bg-field" data-enter="" aria-labelledby="hero-h">
        <div class="wrap">
          <div class="hero-text hero__in">
            <h1 id="hero-h" data-split="">
              {since ? `Engineer since ${formatMonth(since)}` : `About ${site?.name ?? 'me'}`}
            </h1>
            <div class="grid hero__foot">
              <div class="span-6">
                <p class="hero__lead">
                  Backend services in Node.js, TypeScript and Bun, plus the React and React Native
                  clients that use them.
                </p>
                <div class="btn-row">
                  <EmailButton site={site} />
                  {projects.length > 0 ? (
                    <a class="btn btn--secondary" href={routes.work.index.href()} data-cursor="link">
                      See the case studies
                    </a>
                  ) : null}
                </div>
              </div>
              {hasFacts ? (
                <dl class="hero__facts hero__facts--col span-5 start-8">
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
          </div>
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
      <section class="section" id="story" aria-labelledby="story-h">
        <div class="wrap">
          <div class="section-head">
            <h2 id="story-h" data-split="">
              Background and education
            </h2>
          </div>
          <div class="grid">
            {story.length > 0 ? (
              <div class="story span-7">
                {story.map((text, index) => (
                  <p key={index}>{text}</p>
                ))}
              </div>
            ) : null}
            <div class="span-4 start-9">
              {education.length > 0 ? (
                <div class="aside-block">
                  <p class="t-label muted">Education</p>
                  {education.map((entry, index) => (
                    <div key={index} class="stack-2">
                      <h3 class="t-card">{entry.degree}</h3>
                      <p>{entry.school}</p>
                      <p class="t-small muted">
                        {entry.end ? formatSpan(entry.start, entry.end) : `From ${formatMonth(entry.start)}`}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
              {links.length > 0 ? (
                <div class="aside-block">
                  <p class="t-label muted">Elsewhere</p>
                  <div class="ic-chip-row">
                    {links.map((link) => {
                      let icon = toolIcon(link.name)
                      return (
                        <a key={link.name} class="ic-chip ic-chip--lg" href={link.href} rel="me" data-cursor="link">
                          {icon ? <ToolIconImg icon={icon} name={link.name} size={24} decorative /> : null}
                          {link.name}
                        </a>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
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
    let bullets = experience.reduce((sum, entry) => sum + entry.bullets.length, 0)

    return (
      <section
        class="section ground-surface"
        id="experience"
        style={{ '--h': bullets > 8 ? 2 : 1 }}
        data-timeline=""
        aria-labelledby="experience-h"
      >
        <div class="wrap">
          <div class="section-head">
            <h2 id="experience-h" data-split="">
              Roles and what I shipped in each
            </h2>
            {since ? (
              <p>
                {experience.length} {experience.length === 1 ? 'role' : 'roles'} since{' '}
                {formatMonth(since)}.
              </p>
            ) : null}
          </div>
          <ol class="history">
            {experience.map((entry) => (
              <li key={entry.id} class="grid" data-timeline-entry={entry.id}>
                <div class="span-4">
                  <p class="t-label history__when">{formatSpan(entry.start, entry.end)}</p>
                  <h3>{entry.company}</h3>
                  <p>{entry.role}</p>
                </div>
                {entry.bullets.length > 0 ? (
                  <ul class="span-8 start-5">
                    {entry.bullets.map((bullet, index) => (
                      <li key={index}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>
    )
  }
}
