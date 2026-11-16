import type { Handle, RemixNode } from 'remix/component'

import type { Site } from '../data/content.ts'
import { routes } from '../routes.ts'
import { displayUrl } from '../ui/format.ts'
import { EmailButton, Layout, type Frame } from '../ui/layout.tsx'
import { ToolIconImg } from '../ui/parts.tsx'
import { toolIcon } from '../ui/tool-icons.ts'

export function ContactPage(handle: Handle<{ frame: Frame }>) {
  return () => {
    let { frame } = handle.props
    let { site } = frame
    let name = site?.name ?? ''

    return (
      <Layout
        title={name ? `${name}: email, LinkedIn and GitHub` : 'Contact'}
        description={
          name
            ? `How to reach ${name} about a full-stack or backend role or project.`
            : 'Contact details.'
        }
        pageType="contact"
        frame={frame}
      >
        <section class="hero hero--statement bg-halo" data-enter="" aria-labelledby="hero-h">
          <div class="wrap">
            <div class="hero-text hero__in">
              <div>
                <h1 id="hero-h" data-split="" data-moment="liquid-type">
                  {name ? `${name}, full-stack engineer` : 'Contact'}
                </h1>
                <p class="hero__lead">
                  Write about a role or a project by email, or find me on LinkedIn and GitHub.
                </p>
                <div class="btn-row">
                  <EmailButton site={site} />
                </div>
              </div>
            </div>
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
    ] as const) {
      if (!url) continue
      let icon = toolIcon(label)
      rows.push({
        label,
        value: displayUrl(url),
        href: url,
        icon: icon ? <ToolIconImg icon={icon} name={label} size={24} decorative /> : null,
      })
    }
    if (site.resumeMediaId) {
      rows.push({
        label: 'Resume',
        value: 'Download the resume (PDF)',
        href: routes.media.href({ id: site.resumeMediaId }),
        icon: <FileGlyph />,
      })
    }
    if (rows.length === 0) return null

    return (
      <section class="section bg-dots" id="links" aria-labelledby="links-h">
        <div class="wrap">
          <div class="section-head">
            <h2 id="links-h" data-split="">
              Email, LinkedIn and GitHub
            </h2>
            <p>Email goes to my own inbox; LinkedIn and GitHub are my personal accounts.</p>
          </div>
          <ul class="ic-list contact-list">
            {rows.map((row) => (
              <li key={row.label} class="ic-row">
                <span class="ic-tile ic-tile--48">{row.icon}</span>
                <span class="ic-row__main">
                  <span class="ic-row__meta">{row.label}</span>
                  <a
                    class="link ic-row__title"
                    href={row.href}
                    rel={row.label === 'Email' || row.label === 'Resume' ? undefined : 'me'}
                    download={row.label === 'Resume' ? '' : undefined}
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
    <svg
      class="ic ic-svg ic-24"
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
  )
}

function FileGlyph() {
  return () => (
    <svg
      class="ic ic-svg ic-24"
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
  )
}
