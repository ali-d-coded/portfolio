import * as assert from 'remix/assert'
import { afterEach, beforeEach, describe, it } from 'remix/test'

import type { ContentSnapshot, Experience, Project, Site, SkillGroup } from './content.ts'
import { SlugTakenError, StoreNotEmptyError } from './errors.ts'
import type { ContentStore } from './store.ts'

export function makeSite(): Site {
  return {
    name: 'Test Person',
    role: 'Engineer',
    heroHeadline: 'Builds things',
    summary: 'A short summary.',
    about: 'A longer about text.',
    email: 'person@example.com',
    linkedinUrl: 'https://linkedin.example/in/person',
    githubUrl: 'https://github.example/person',
    resumeMediaId: 'm1',
    education: [
      { degree: 'BSc', school: 'School A', start: '2015-09', end: '2019-06' },
      { degree: 'MSc', school: 'School B', start: '2020-09', end: null },
    ],
  }
}

export function makeProject(id: string, overrides: Partial<Project> = {}): Project {
  return {
    id,
    slug: `slug-${id}`,
    title: `Project ${id}`,
    tagline: 'A tagline',
    stack: ['TypeScript', 'SQLite'],
    summary: 'Summary',
    figures: [
      { value: '10', label: 'things' },
      { value: '20', label: 'other things' },
    ],
    blocks: [
      { type: 'heading', text: 'Heading' },
      { type: 'text', text: 'Body text' },
      { type: 'image', mediaId: 'm1' },
      { type: 'figures', items: [{ value: '1', label: 'one' }] },
    ],
    coverMediaId: 'm1',
    featured: true,
    published: true,
    position: 0,
    ...overrides,
  }
}

export function makeExperience(id: string, position = 0): Experience {
  return {
    id,
    company: `Company ${id}`,
    role: 'Developer',
    start: '2020-01',
    end: null,
    bullets: ['Did a thing', 'Did another thing'],
    skills: ['TypeScript'],
    position,
  }
}

export function makeSkillGroup(id: string, position = 0): SkillGroup {
  return { id, name: `Group ${id}`, items: ['a', 'b'], position }
}

export function makeSnapshot(): ContentSnapshot {
  return {
    version: 1,
    site: makeSite(),
    projects: [makeProject('p1', { position: 0 }), makeProject('p2', { position: 1 })],
    experience: [makeExperience('e1', 0), makeExperience('e2', 1)],
    skillGroups: [makeSkillGroup('g1', 0), makeSkillGroup('g2', 1)],
    media: [
      {
        id: 'm1',
        key: 'abc123.png',
        name: 'cover.png',
        alt: 'A cover',
        contentType: 'image/png',
        size: 1234,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  }
}

export function describeContentStore(name: string, create: () => Promise<ContentStore>): void {
  describe(`content store contract: ${name}`, () => {
    let store: ContentStore

    beforeEach(async () => {
      store = await create()
    })

    afterEach(async () => {
      await store.close()
    })

    it('starts empty', async () => {
      assert.equal(await store.isEmpty(), true)
      assert.equal(await store.getSite(), null)
      assert.deepEqual(await store.listProjects(), [])
      assert.deepEqual(await store.listExperience(), [])
      assert.deepEqual(await store.listSkillGroups(), [])
      assert.deepEqual(await store.listMedia(), [])
    })

    it('site round trip', async () => {
      let site = makeSite()
      await store.saveSite(site)
      assert.deepEqual(await store.getSite(), site)
      assert.equal(await store.isEmpty(), false)
    })

    it('project round trip', async () => {
      let project = makeProject('p1')
      await store.saveProject(project)
      assert.deepEqual(await store.getProjectBySlug(project.slug), project)
      assert.deepEqual(await store.getProject('p1'), project)
    })

    it('publishedOnly filters', async () => {
      await store.saveProject(makeProject('p1', { published: true }))
      await store.saveProject(makeProject('p2', { published: false, position: 1 }))
      assert.equal((await store.listProjects()).length, 2)
      let published = await store.listProjects({ publishedOnly: true })
      assert.equal(published.length, 1)
      assert.equal(published[0].id, 'p1')
    })

    it('slug is unique', async () => {
      let first = makeProject('p1', { slug: 'same' })
      await store.saveProject(first)
      await assert.rejects(
        () => store.saveProject(makeProject('p2', { slug: 'same' })),
        SlugTakenError,
      )
      await store.saveProject({ ...first, title: 'Renamed' })
      assert.equal((await store.getProject('p1'))?.title, 'Renamed')
      assert.equal((await store.listProjects()).length, 1)
    })

    it('reorder', async () => {
      for (let [i, id] of ['a', 'b', 'c'].entries()) {
        await store.saveProject(makeProject(id, { position: i }))
        await store.saveExperience(makeExperience(id, i))
        await store.saveSkillGroup(makeSkillGroup(id, i))
      }
      let ids = <T extends { id: string }>(items: T[]) => items.map((item) => item.id)

      await store.reorderProjects(['c', 'a', 'b'])
      assert.deepEqual(ids(await store.listProjects()), ['c', 'a', 'b'])
      await store.reorderExperience(['c', 'a', 'b'])
      assert.deepEqual(ids(await store.listExperience()), ['c', 'a', 'b'])
      await store.reorderSkillGroups(['c', 'a', 'b'])
      assert.deepEqual(ids(await store.listSkillGroups()), ['c', 'a', 'b'])
    })

    it('delete', async () => {
      let snapshot = makeSnapshot()
      await store.importAll(snapshot)

      await store.deleteProject('p1')
      await store.deleteExperience('e1')
      await store.deleteSkillGroup('g1')
      await store.deleteMedia('m1')

      assert.equal(await store.getProject('p1'), null)
      assert.equal(await store.getExperience('e1'), null)
      assert.equal(await store.getSkillGroup('g1'), null)
      assert.equal(await store.getMedia('m1'), null)
      assert.deepEqual(
        (await store.listProjects()).map((p) => p.id),
        ['p2'],
      )
      assert.deepEqual(
        (await store.listExperience()).map((e) => e.id),
        ['e2'],
      )
      assert.deepEqual(
        (await store.listSkillGroups()).map((g) => g.id),
        ['g2'],
      )
      assert.deepEqual(await store.listMedia(), [])
    })

    it('export then import', async () => {
      let snapshot = makeSnapshot()
      await store.importAll(snapshot)
      let exported = await store.exportAll()
      assert.deepEqual(exported, snapshot)

      let other = await create()
      try {
        await other.importAll(exported)
        assert.deepEqual(await other.exportAll(), exported)
      } finally {
        await other.close()
      }
    })

    it('import refuses a non-empty store', async () => {
      await store.saveSite(makeSite())
      await assert.rejects(() => store.importAll(makeSnapshot()), StoreNotEmptyError)
    })
  })
}
