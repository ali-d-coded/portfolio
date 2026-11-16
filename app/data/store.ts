import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

import type { ContentSnapshot, Experience, Media, Project, Site, SkillGroup } from './content.ts'

export { SlugTakenError, StoreNotEmptyError } from './errors.ts'

export interface ContentStore {
  isEmpty(): Promise<boolean>
  getSite(): Promise<Site | null>
  saveSite(site: Site): Promise<void>
  listProjects(options?: { publishedOnly?: boolean }): Promise<Project[]> // ordered by position
  getProject(id: string): Promise<Project | null>
  getProjectBySlug(slug: string): Promise<Project | null>
  saveProject(project: Project): Promise<void> // upsert by id; throws SlugTakenError
  deleteProject(id: string): Promise<void>
  reorderProjects(ids: string[]): Promise<void> // position = index in ids
  listExperience(): Promise<Experience[]>
  getExperience(id: string): Promise<Experience | null>
  saveExperience(entry: Experience): Promise<void>
  deleteExperience(id: string): Promise<void>
  reorderExperience(ids: string[]): Promise<void>
  listSkillGroups(): Promise<SkillGroup[]>
  getSkillGroup(id: string): Promise<SkillGroup | null>
  saveSkillGroup(group: SkillGroup): Promise<void>
  deleteSkillGroup(id: string): Promise<void>
  reorderSkillGroups(ids: string[]): Promise<void>
  listMedia(): Promise<Media[]>
  getMedia(id: string): Promise<Media | null>
  saveMedia(media: Media): Promise<void>
  deleteMedia(id: string): Promise<void>
  exportAll(): Promise<ContentSnapshot>
  importAll(snapshot: ContentSnapshot): Promise<void> // throws StoreNotEmptyError
  close(): Promise<void>
}

export async function createContentStore(
  env: NodeJS.ProcessEnv = process.env,
): Promise<ContentStore> {
  let kind = env.CONTENT_STORE ?? 'sqlite'
  if (kind !== 'sqlite') {
    throw new Error(`Unknown CONTENT_STORE: ${kind}`)
  }

  let filename =
    env.CONTENT_DB_FILE ?? (env.NODE_ENV === 'test' ? ':memory:' : 'data/content.sqlite')
  if (filename !== ':memory:') {
    mkdirSync(dirname(filename), { recursive: true })
  }

  // Imported lazily so sqlite-store.ts can import this module's error classes without a cycle.
  let { createSqliteContentStore } = await import('./sqlite-store.ts')
  return createSqliteContentStore({ filename })
}

// The app-wide instance. Opening it runs the adapter's migrations.
export const store: ContentStore = await createContentStore()
