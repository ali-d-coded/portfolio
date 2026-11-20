import type { Site } from '../data/content.ts'
import type { ContentStore } from '../data/store.ts'
import type { Field, Parsed, Values } from './collections.ts'
import { formatEducation, isSafeUrl, parseEducation } from './parse.ts'

export const siteFields: Field[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'role', label: 'Role', type: 'text', required: true, hint: 'Shown beside your name in the top bar. Text before a "|" is used there.' },
  { name: 'heroHeadline', label: 'Home page headline', type: 'text', required: true },
  { name: 'summary', label: 'Home page summary', type: 'textarea', rows: 3, hint: 'The line under the headline.' },
  { name: 'about', label: 'About', type: 'textarea', rows: 8, hint: 'A paragraph ends at a blank line.' },
  { name: 'email', label: 'Email', type: 'text', required: true },
  { name: 'linkedinUrl', label: 'LinkedIn link', type: 'url' },
  { name: 'githubUrl', label: 'GitHub link', type: 'url' },
  { name: 'education', label: 'Education', type: 'textarea', rows: 3, hint: 'One per line: Degree | School | 2024-06 | 2027-06 (the end is optional).' },
]

export function siteValues(site: Site | null): Values {
  if (!site) return {}
  return {
    name: site.name,
    role: site.role,
    heroHeadline: site.heroHeadline,
    summary: site.summary,
    about: site.about,
    email: site.email,
    linkedinUrl: site.linkedinUrl,
    githubUrl: site.githubUrl,
    education: formatEducation(site.education),
  }
}

export async function saveSiteValues(store: ContentStore, values: Values): Promise<Parsed<Record<string, never>>> {
  let errors: Record<string, string> = {}
  let text = (name: string) => (values[name] ?? '').trim()
  if (!text('name')) errors.name = 'A name is needed.'
  if (!text('role')) errors.role = 'A role is needed.'
  if (!text('heroHeadline')) errors.heroHeadline = 'A headline is needed.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text('email'))) errors.email = 'Use a full email address.'
  for (let name of ['linkedinUrl', 'githubUrl']) {
    if (text(name) && !isSafeUrl(text(name))) errors[name] = 'Use a full link starting with https://'
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors }

  let existing = await store.getSite()
  await store.saveSite({
    name: text('name'),
    role: text('role'),
    heroHeadline: text('heroHeadline'),
    summary: text('summary'),
    about: (values.about ?? '').replace(/\r\n/g, '\n').trim(),
    email: text('email'),
    linkedinUrl: text('linkedinUrl'),
    githubUrl: text('githubUrl'),
    resumeMediaId: existing?.resumeMediaId ?? null,
    education: parseEducation(values.education ?? ''),
  })
  return { ok: true, item: {} }
}
