import { randomUUID } from 'node:crypto'

import type { Experience, Project, SkillGroup } from '../data/content.ts'
import { SlugTakenError } from '../data/errors.ts'
import type { ContentStore } from '../data/store.ts'
import {
  formatBlocks,
  formatDetails,
  formatFigures,
  formatGains,
  formatScreens,
  formatStages,
  isMonth,
  isSafeUrl,
  parseBlocks,
  parseDetails,
  parseFigures,
  parseGains,
  parseScreens,
  parseStages,
  parseLines,
  parseTags,
  slugify,
} from './parse.ts'

export type Kind = 'projects' | 'experience' | 'skills'

export const KINDS: Kind[] = ['projects', 'experience', 'skills']

export function isKind(value: string): value is Kind {
  return (KINDS as string[]).includes(value)
}

export interface Field {
  name: string
  label: string
  type: 'text' | 'textarea' | 'month' | 'checkbox' | 'url' | 'image' | 'pdf' | 'screens'
  hint?: string
  rows?: number
  required?: boolean
}

export type Values = Record<string, string>

/** A row in the admin's list: one line of identity and whether visitors can see it. */
export interface Row {
  id: string
  title: string
  detail: string
  draft: boolean
}

export type Parsed<T> = { ok: true; item: T } | { ok: false; errors: Record<string, string> }

export interface Collection {
  label: string
  singular: string
  fields: Field[]
  rows(store: ContentStore): Promise<Row[]>
  values(store: ContentStore, id: string): Promise<Values | null>
  blank: Values
  /** Reads the submitted fields, validates them and writes to the store. */
  save(store: ContentStore, id: string | null, values: Values): Promise<Parsed<{ id: string }>>
  remove(store: ContentStore, id: string): Promise<void>
  reorder(store: ContentStore, ids: string[]): Promise<void>
}

function checked(values: Values, name: string): boolean {
  return values[name] === 'on'
}

const projects: Collection = {
  label: 'Projects',
  singular: 'project',
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'slug', label: 'Address', type: 'text', hint: 'The end of the page URL. Left empty, it is made from the title.' },
    { name: 'tagline', label: 'Tagline', type: 'text' },
    { name: 'headline', label: 'Home page card title', type: 'text', hint: 'Optional. Left empty, the card uses the title.' },
    { name: 'badge', label: 'Badge', type: 'text', hint: 'A short label on the home page card, such as Flagship SaaS.' },
    { name: 'gains', label: 'What a business gets', type: 'textarea', rows: 5, hint: 'Shown as plain rows at the top of the project page, up to six. One per line: Title | One sentence in plain words' },
    { name: 'stages', label: 'Route of a message', type: 'textarea', rows: 8, hint: 'The stops a plane flies through on the project page. One per line: Name | Short line | Tool name for the logo | What it means for the client' },
    { name: 'screens', label: 'App screenshots', type: 'screens', rows: 4, hint: 'One per line: web, mobile or admin | Label | /media/link. Upload screenshots below and they are added here.' },
    { name: 'details', label: 'Card facts', type: 'textarea', rows: 4, hint: 'Saved with the project but no longer shown on the home page card, which now carries the summary and tool logos. One per line: Architecture | API Gateway + Tenant RBAC' },
    { name: 'summary', label: 'Summary', type: 'textarea', rows: 4, hint: 'Shown on the project cards.' },
    { name: 'myRole', label: 'My role', type: 'text', hint: 'Optional. Your title, the employer and the dates, shown at the top of the project page.' },
    { name: 'stack', label: 'Tools', type: 'text', hint: 'Separated by commas.' },
    { name: 'liveUrl', label: 'Live site', type: 'url', hint: 'A link with a preview on the project page.' },
    { name: 'liveNote', label: 'Live site note', type: 'text', hint: 'Optional. One line under the preview saying what the linked site is, if it is not the project itself.' },
    { name: 'previewImage', label: 'Preview image', type: 'image', hint: 'A screenshot of the live site. Upload one, or paste a path or link.' },
    { name: 'figures', label: 'Key figures', type: 'textarea', rows: 3, hint: 'One per line: 30+ | client businesses' },
    {
      name: 'blocks',
      label: 'Project story',
      type: 'textarea',
      rows: 16,
      hint: 'A paragraph ends at a blank line. A line starting with "# " is a heading. A "figures: 3 | apps ; 2 | stores" line makes a row of figures.',
    },
    { name: 'featured', label: 'Feature on the home page', type: 'checkbox' },
    { name: 'published', label: 'Published', type: 'checkbox' },
  ],
  blank: { published: 'on', featured: '' },
  async rows(store) {
    return (await store.listProjects()).map((project) => ({
      id: project.id,
      title: project.title,
      detail: project.tagline,
      draft: !project.published,
    }))
  },
  async values(store, id) {
    let project = await store.getProject(id)
    if (!project) return null
    return {
      title: project.title,
      slug: project.slug,
      tagline: project.tagline,
      headline: project.headline ?? '',
      badge: project.badge ?? '',
      details: formatDetails(project.details ?? []),
      gains: formatGains(project.gains ?? []),
      stages: formatStages(project.stages ?? []),
      screens: formatScreens(project.screens ?? []),
      summary: project.summary,
      stack: project.stack.join(', '),
      liveUrl: project.liveUrl ?? '',
      liveNote: project.liveNote ?? '',
      myRole: project.myRole ?? '',
      previewImage: project.previewImage ?? '',
      figures: formatFigures(project.figures),
      blocks: formatBlocks(project.blocks),
      featured: project.featured ? 'on' : '',
      published: project.published ? 'on' : '',
    }
  },
  async save(store, id, values) {
    let errors: Record<string, string> = {}
    let title = (values.title ?? '').trim()
    if (!title) errors.title = 'A title is needed.'
    let slug = slugify(values.slug?.trim() || title)
    if (!slug) errors.slug = 'The address needs letters or numbers.'
    let liveUrl = (values.liveUrl ?? '').trim()
    if (liveUrl && !isSafeUrl(liveUrl)) errors.liveUrl = 'Use a full link starting with https://'
    let previewImage = (values.previewImage ?? '').trim()
    if (previewImage && !isSafeUrl(previewImage, { allowPath: true })) {
      errors.previewImage = 'Use an uploaded image, a path such as /projects/shot.jpg, or an https:// link.'
    }
    if (Object.keys(errors).length > 0) return { ok: false, errors }

    let existing = id ? await store.getProject(id) : null
    let all = await store.listProjects()
    let project: Project = {
      id: existing?.id ?? (all.some((other) => other.id === slug) ? randomUUID() : slug),
      slug,
      title,
      tagline: (values.tagline ?? '').trim(),
      summary: (values.summary ?? '').trim(),
      stack: parseTags(values.stack ?? ''),
      figures: parseFigures(values.figures ?? ''),
      blocks: parseBlocks(values.blocks ?? ''),
      coverMediaId: existing?.coverMediaId ?? null,
      featured: checked(values, 'featured'),
      published: checked(values, 'published'),
      position: existing?.position ?? all.length,
    }
    let headline = (values.headline ?? '').trim().slice(0, 140)
    if (headline) project.headline = headline
    let badge = (values.badge ?? '').trim().slice(0, 40)
    if (badge) project.badge = badge
    let details = parseDetails(values.details ?? '')
    if (details.length > 0) project.details = details
    let gains = parseGains(values.gains ?? '')
    if (gains.length > 0) project.gains = gains
    let stages = parseStages(values.stages ?? '')
    if (stages.length > 0) project.stages = stages
    let screens = parseScreens(values.screens ?? '')
    if (screens.length > 0) project.screens = screens
    if (liveUrl) project.liveUrl = liveUrl
    let liveNote = (values.liveNote ?? '').replace(/\s+/g, ' ').trim().slice(0, 200)
    if (liveNote) project.liveNote = liveNote
    let myRole = (values.myRole ?? '').replace(/\s+/g, ' ').trim().slice(0, 200)
    if (myRole) project.myRole = myRole
    if (previewImage) project.previewImage = previewImage
    try {
      await store.saveProject(project)
    } catch (error) {
      if (error instanceof SlugTakenError) {
        return { ok: false, errors: { slug: 'Another project already uses this address.' } }
      }
      throw error
    }
    return { ok: true, item: { id: project.id } }
  },
  remove: (store, id) => store.deleteProject(id),
  reorder: (store, ids) => store.reorderProjects(ids),
}

const experience: Collection = {
  label: 'Experience',
  singular: 'job',
  fields: [
    { name: 'company', label: 'Company', type: 'text', required: true },
    { name: 'role', label: 'Role', type: 'text', required: true },
    { name: 'start', label: 'Started', type: 'month', required: true },
    { name: 'end', label: 'Ended', type: 'month', hint: 'Leave empty for a job that is current.' },
    { name: 'bullets', label: 'What you did', type: 'textarea', rows: 8, hint: 'One point per line.' },
    { name: 'skills', label: 'Skills used', type: 'text', hint: 'Separated by commas.' },
  ],
  blank: {},
  async rows(store) {
    return (await store.listExperience()).map((entry) => ({
      id: entry.id,
      title: `${entry.role}, ${entry.company}`,
      detail: `${entry.start} to ${entry.end ?? 'now'}`,
      draft: false,
    }))
  },
  async values(store, id) {
    let entry = await store.getExperience(id)
    if (!entry) return null
    return {
      company: entry.company,
      role: entry.role,
      start: entry.start,
      end: entry.end ?? '',
      bullets: entry.bullets.join('\n'),
      skills: entry.skills.join(', '),
    }
  },
  async save(store, id, values) {
    let errors: Record<string, string> = {}
    let company = (values.company ?? '').trim()
    let role = (values.role ?? '').trim()
    let start = (values.start ?? '').trim()
    let end = (values.end ?? '').trim()
    if (!company) errors.company = 'A company is needed.'
    if (!role) errors.role = 'A role is needed.'
    if (!isMonth(start)) errors.start = 'Pick the month this started.'
    if (end && !isMonth(end)) errors.end = 'Pick a month, or leave this empty.'
    if (end && isMonth(start) && end < start) errors.end = 'This is before the start.'
    if (Object.keys(errors).length > 0) return { ok: false, errors }

    let existing = id ? await store.getExperience(id) : null
    let entry: Experience = {
      id: existing?.id ?? randomUUID(),
      company,
      role,
      start,
      end: end || null,
      bullets: parseLines(values.bullets ?? ''),
      skills: parseTags(values.skills ?? ''),
      position: existing?.position ?? (await store.listExperience()).length,
    }
    await store.saveExperience(entry)
    return { ok: true, item: { id: entry.id } }
  },
  remove: (store, id) => store.deleteExperience(id),
  reorder: (store, ids) => store.reorderExperience(ids),
}

const skills: Collection = {
  label: 'Skills',
  singular: 'skill group',
  fields: [
    { name: 'name', label: 'Group name', type: 'text', required: true },
    { name: 'items', label: 'Skills', type: 'text', hint: 'Separated by commas.' },
  ],
  blank: {},
  async rows(store) {
    return (await store.listSkillGroups()).map((group) => ({
      id: group.id,
      title: group.name,
      detail: group.items.join(', '),
      draft: false,
    }))
  },
  async values(store, id) {
    let group = await store.getSkillGroup(id)
    return group ? { name: group.name, items: group.items.join(', ') } : null
  },
  async save(store, id, values) {
    let name = (values.name ?? '').trim()
    if (!name) return { ok: false, errors: { name: 'A name is needed.' } }
    let existing = id ? await store.getSkillGroup(id) : null
    let group: SkillGroup = {
      id: existing?.id ?? randomUUID(),
      name,
      items: parseTags(values.items ?? ''),
      position: existing?.position ?? (await store.listSkillGroups()).length,
    }
    await store.saveSkillGroup(group)
    return { ok: true, item: { id: group.id } }
  },
  remove: (store, id) => store.deleteSkillGroup(id),
  reorder: (store, ids) => store.reorderSkillGroups(ids),
}

export const collections: Record<Kind, Collection> = { projects, experience, skills }
