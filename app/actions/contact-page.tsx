import type { Handle, RemixNode } from 'remix/component'

import type { Site } from '../data/content.ts'
import { routes } from '../routes.ts'
import { Desk } from '../ui/doodles.tsx'
import { displayUrl } from '../ui/format.ts'
import { EmailButton, Layout, resumeHref, ResumeButtons, type Frame } from '../ui/layout.tsx'
import { SectionHead, ToolTile } from '../ui/parts.tsx'
import { toolIcon } from '../ui/tool-icons.ts'

export function ContactPage(handle: Handle<{ frame: Frame }>) {
  return () => {
    let { frame } = handle.props
    let { site } = frame
    let name = site?.name ?? ''

    return (
      <Layout
        title={name ? `${name}: email, LinkedIn, GitHub and Instagram` : 'Contact'}
        description={
          name
            ? `${name} is open to projects of any size. Email, LinkedIn, GitHub and Instagram to start a conversation about a full-stack or backend build.`
            : 'Contact details.'
        }
        pageType="contact"
        frame={frame}
      >
        <section class="hero" aria-labelledby="hero-h" data-ruler-section="Intro">
          <div class="wrap hero__grid hero__grid--contact">
            <div class="hero__text">
              <p class="term" data-enter="">
                <span aria-hidden="true">&gt;</span> mail --to {name ? name.split(/\s+/)[0]!.toLowerCase() : 'me'}
              </p>
              <h1 id="hero-h" class="hero__title" data-split="" data-hero="">
                {name ? `${name}, full-stack engineer` : 'Contact'}
              </h1>
              <p class="lead" data-enter="">
                I'm open to projects of any size: a new product, a backend that needs fixing, an
                internal tool, or a site that has to work for real customers. Tell me what you're
                trying to build and I'll tell you honestly how I'd do it, what it takes and when it
                could be live.
              </p>
              <p class="lead" data-enter="">
                Send a few lines about the idea by email, or find me on LinkedIn, GitHub and Instagram.
              </p>
              <div class="btns" data-enter="">
                <EmailButton site={site} />
                <ResumeButtons site={site} />
              </div>
            </div>
            <Desk
              variant="contact"
              site={site}
              now={null}
              since={null}
              stack={[]}
              degree={null}
              note=""
            />
          </div>
        </section>
        <Links site={site} />
      </Layout>
    )
  }
}

interface Row {
  label: string
  value: string
  href: string
  icon: RemixNode
}

function Links(handle: Handle<{ site: Site | null }>) {
  return () => {
    let { site } = handle.props
    if (!site) return null
    let rows: Row[] = []
    if (site.email) {
      rows.push({ label: 'Email', value: site.email, href: `mailto:${site.email}`, icon: <MailGlyph /> })
    }
    for (let [label, url] of [
      ['LinkedIn', site.linkedinUrl],
      ['GitHub', site.githubUrl],
      ['Instagram', site.instagramUrl],
    ] as const) {
      if (!url) continue
      let icon = toolIcon(label)
      rows.push({
        label,
        value: displayUrl(url),
        href: url,
        icon: icon ? <ToolTile icon={icon} name={label} size={40} /> : null,
      })
    }
    rows.push({
      label: 'Resume',
      value: 'View the resume (PDF)',
      href: resumeHref(site),
      icon: <FileGlyph />,
    })
    if (rows.length === 0) return null

    return (
      <section class="section" id="links" aria-labelledby="links-h" data-ruler-section="Links">
        <div class="wrap">
          <SectionHead id="links-h" title="Email and social accounts">
            <p class="section-head__lead">
              Email goes to my own inbox; LinkedIn, GitHub and Instagram are my personal accounts.
            </p>
          </SectionHead>
          <ul class="contact-list">
            {rows.map((row) => (
              <li key={row.label} class="panel contact-row" data-reveal="">
                <span class="contact-row__icon">{row.icon}</span>
                <span class="contact-row__main">
                  <span class="label">{row.label}</span>
                  <a
                    class="link contact-row__value"
                    href={row.href}
                    rel={row.label === 'Email' || row.label === 'Resume' ? undefined : 'me'}
                    data-cursor="link"
                  >
                    {row.value}
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    )
  }
}

function MailGlyph() {
  return () => (
    <span class="tile tile--40 tile--glyph">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m22 7l-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
        <rect width="20" height="16" x="2" y="4" rx="2" />
      </svg>
    </span>
  )
}

function FileGlyph() {
  return () => (
    <span class="tile tile--40 tile--glyph">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
        <path d="M14 2v5a1 1 0 0 0 1 1h5M10 9H8m8 4H8m8 4H8" />
      </svg>
    </span>
  )
}
