import { fileURLToPath } from 'node:url'
import { column as c, rawSql, table } from 'remix/data-table'
import type { Database } from 'remix/data-table'
import { loadMigrations } from 'remix/data-table/migrations/node'
import { createSqliteDatabase } from 'remix/data-table/sqlite'

import type { Experience, Media, Project, Site, SkillGroup } from './content.ts'
import { SlugTakenError, StoreNotEmptyError } from './errors.ts'
import type { ContentStore } from './store.ts'

let siteTable = table({ name: 'site', columns: { id: c.integer(), data: c.text() } })
let projectsTable = table({
  name: 'projects',
  columns: {
    id: c.text(),
    slug: c.text(),
    title: c.text(),
    published: c.integer(),
    position: c.integer(),
    data: c.text(),
  },
})
let experienceTable = table({
  name: 'experience',
  columns: { id: c.text(), position: c.integer(), data: c.text() },
})
let skillGroupsTable = table({
  name: 'skill_groups',
  columns: { id: c.text(), position: c.integer(), data: c.text() },
})
let mediaTable = table({
  name: 'media',
  columns: { id: c.text(), created_at: c.text(), data: c.text() },
})

let tableNames = ['site', 'projects', 'experience', 'skill_groups', 'media']
type OrderedTable = typeof projectsTable | typeof experienceTable | typeof skillGroupsTable

let migrationsDirectory = fileURLToPath(new URL('../../db/migrations/', import.meta.url))

// Test-only: lets `clearSqliteStore` reach the database behind a store. Not on ContentStore.
let databases = new WeakMap<ContentStore, Database>()

/** Test-only. Deletes every row from a store made by `createSqliteContentStore`. */
export async function clearSqliteStore(store: ContentStore): Promise<void> {
  let db = databases.get(store)
  if (!db) throw new Error('clearSqliteStore only works on SQLite content stores')
  await db.transaction(async (tx) => {
    for (let name of tableNames) await tx.exec(rawSql('delete from ' + name))
  })
}

function isSlugConflict(error: unknown): boolean {
  for (let e: unknown = error; e instanceof Error; e = e.cause) {
    if (/UNIQUE constraint failed: projects\.slug/i.test(e.message)) return true
  }
  return false
}

function parse<T>(row: { data: string } | null): T | null {
  return row ? (JSON.parse(row.data) as T) : null
}

function parseAll<T>(rows: { data: string }[]): T[] {
  return rows.map((row) => JSON.parse(row.data) as T)
}

export async function createSqliteContentStore(options: {
  filename: string
}): Promise<ContentStore> {
  let db = createSqliteDatabase({ filename: options.filename, foreignKeys: true })
  await db.migrate(await loadMigrations(migrationsDirectory))

  async function hasContent(tx: Database): Promise<boolean> {
    for (let name of tableNames) {
      let result = await tx.exec(rawSql('select 1 from ' + name + ' limit 1'))
      if (result.rows && result.rows.length > 0) return true
    }
    return false
  }

  async function reorder(t: OrderedTable, ids: string[]) {
    await db.transaction(async (tx) => {
      for (let [index, id] of ids.entries()) {
        let row = await tx.find(t, id)
        if (!row) continue
        let data = JSON.stringify({ ...JSON.parse(row.data), position: index })
        await tx.update(t, id, { position: index, data })
      }
    })
  }

  async function writeProject(tx: Database, p: Project) {
    let row = {
      slug: p.slug,
      title: p.title,
      published: p.published ? 1 : 0,
      position: p.position,
      data: JSON.stringify(p),
    }
    if (await tx.find(projectsTable, p.id)) await tx.update(projectsTable, p.id, row)
    else await tx.create(projectsTable, { id: p.id, ...row })
  }

  async function writeOrdered(
    tx: Database,
    t: typeof experienceTable | typeof skillGroupsTable,
    entry: { id: string; position: number },
  ) {
    let row = { position: entry.position, data: JSON.stringify(entry) }
    if (await tx.find(t, entry.id)) await tx.update(t, entry.id, row)
    else await tx.create(t, { id: entry.id, ...row })
  }

  async function writeMedia(tx: Database, m: Media) {
    let row = { created_at: m.createdAt, data: JSON.stringify(m) }
    if (await tx.find(mediaTable, m.id)) await tx.update(mediaTable, m.id, row)
    else await tx.create(mediaTable, { id: m.id, ...row })
  }

  async function writeSite(tx: Database, site: Site) {
    let data = JSON.stringify(site)
    if (await tx.find(siteTable, 1)) await tx.update(siteTable, 1, { data })
    else await tx.create(siteTable, { id: 1, data })
  }

  async function listProjects(opts?: { publishedOnly?: boolean }): Promise<Project[]> {
    let rows = await db
      .query(projectsTable)
      .where(opts?.publishedOnly ? { published: 1 } : {})
      .orderBy('position', 'asc')
      .orderBy('id', 'asc')
      .all()
    return parseAll<Project>(rows)
  }

  async function listOrdered<T>(t: typeof experienceTable | typeof skillGroupsTable): Promise<T[]> {
    let rows = await db.query(t).orderBy('position', 'asc').orderBy('id', 'asc').all()
    return parseAll<T>(rows)
  }

  async function listMedia(): Promise<Media[]> {
    let rows = await db
      .query(mediaTable)
      .orderBy('created_at', 'asc')
      .orderBy('id', 'asc')
      .all()
    return parseAll<Media>(rows)
  }

  let self: ContentStore = {
    async isEmpty() {
      return !(await hasContent(db))
    },
    async getSite() {
      return parse<Site>(await db.find(siteTable, 1))
    },
    async saveSite(site) {
      await db.transaction((tx) => writeSite(tx, site))
    },
    listProjects,
    async getProject(id) {
      return parse<Project>(await db.find(projectsTable, id))
    },
    async getProjectBySlug(slug) {
      return parse<Project>(await db.findOne(projectsTable, { where: { slug } }))
    },
    async saveProject(project) {
      try {
        await db.transaction((tx) => writeProject(tx, project))
      } catch (error) {
        if (isSlugConflict(error)) throw new SlugTakenError(`Slug already taken: ${project.slug}`)
        throw error
      }
    },
    async deleteProject(id) {
      await db.delete(projectsTable, id)
    },
    reorderProjects: (ids) => reorder(projectsTable, ids),
    listExperience: () => listOrdered<Experience>(experienceTable),
    async getExperience(id) {
      return parse<Experience>(await db.find(experienceTable, id))
    },
    async saveExperience(entry) {
      await db.transaction((tx) => writeOrdered(tx, experienceTable, entry))
    },
    async deleteExperience(id) {
      await db.delete(experienceTable, id)
    },
    reorderExperience: (ids) => reorder(experienceTable, ids),
    listSkillGroups: () => listOrdered<SkillGroup>(skillGroupsTable),
    async getSkillGroup(id) {
      return parse<SkillGroup>(await db.find(skillGroupsTable, id))
    },
    async saveSkillGroup(group) {
      await db.transaction((tx) => writeOrdered(tx, skillGroupsTable, group))
    },
    async deleteSkillGroup(id) {
      await db.delete(skillGroupsTable, id)
    },
    reorderSkillGroups: (ids) => reorder(skillGroupsTable, ids),
    listMedia,
    async getMedia(id) {
      return parse<Media>(await db.find(mediaTable, id))
    },
    async saveMedia(media) {
      await db.transaction((tx) => writeMedia(tx, media))
    },
    async deleteMedia(id) {
      await db.delete(mediaTable, id)
    },
    async exportAll() {
      return {
        version: 1,
        site: await self.getSite(),
        projects: await listProjects(),
        experience: await self.listExperience(),
        skillGroups: await self.listSkillGroups(),
        media: await listMedia(),
      }
    },
    async importAll(snapshot) {
      await db.transaction(async (tx) => {
        if (await hasContent(tx)) {
          throw new StoreNotEmptyError('Cannot import into a store that already has content')
        }
        if (snapshot.site) await writeSite(tx, snapshot.site)
        for (let p of snapshot.projects) await writeProject(tx, p)
        for (let e of snapshot.experience) await writeOrdered(tx, experienceTable, e)
        for (let g of snapshot.skillGroups) await writeOrdered(tx, skillGroupsTable, g)
        for (let m of snapshot.media) await writeMedia(tx, m)
      })
    },
    async close() {
      await db.close()
    },
  }

  databases.set(self, db)
  return self
}
