import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import type { ContentSnapshot, Project } from '../data/content.ts'
import { seedSnapshot } from '../data/seed.ts'
import { resetStore } from '../data/test-helpers.ts'
import { router } from '../router.ts'
import { routes } from '../routes.ts'

function get(path: string) {
  return router.fetch(new URL(path, 'http://localhost'))
}

function seedCopy(): ContentSnapshot {
  return structuredClone(seedSnapshot)
}

const publicPaths = ['/', '/work', '/work/eazycrm', '/about', '/contact']

describe('public pages', () => {
  it('render every public page from the seeded store', async () => {
    await resetStore(seedCopy())

    for (let path of publicPaths) {
      let response = await get(path)
      assert.equal(response.status, 200, path)
      assert.match(response.headers.get('Content-Type') ?? '', /text\/html/, path)
      assert.match(await response.text(), /<html[\s>]/, path)
    }

    assert.match(await (await get(routes.home.href())).text(), /Ali Afthab/)
    assert.match(
      await (await get(routes.work.show.href({ slug: 'eazycrm' }))).text(),
      /EazyCRM/,
    )
  })

  it('GET /work/nope returns a 404 page', async () => {
    await resetStore(seedCopy())

    let response = await get('/work/nope')
    assert.equal(response.status, 404)
    assert.match(response.headers.get('Content-Type') ?? '', /text\/html/)
    assert.match(await response.text(), /<html[\s>]/)
  })

  it('an unpublished project is not public', async () => {
    let snapshot = seedCopy()
    let pos = snapshot.projects.find((project) => project.slug === 'restaurant-pos')
    assert.ok(pos)
    pos.published = false
    await resetStore(snapshot)

    assert.equal((await get('/work/restaurant-pos')).status, 404)
    let work = await (await get('/work')).text()
    assert.equal(work.includes('/work/restaurant-pos'), false)
    assert.equal(work.includes(pos.title), false)
    let home = await (await get('/')).text()
    assert.equal(home.includes('/work/restaurant-pos'), false)
  })

  it('empty store sections leave no empty list or heading behind', async () => {
    let snapshot = seedCopy()
    snapshot.projects = []
    snapshot.skillGroups = []
    snapshot.experience = []
    await resetStore(snapshot)

    for (let path of ['/', '/work', '/about', '/contact']) {
      let response = await get(path)
      assert.equal(response.status, 200, path)
      let html = await response.text()
      assert.doesNotMatch(html, /<ul[^>]*>\s*<\/ul>/, path)
      assert.doesNotMatch(html, /<ol[^>]*>\s*<\/ol>/, path)
      assert.doesNotMatch(html, /data-project-list|data-skills|data-timeline|data-pipeline/, path)
      assert.doesNotMatch(html, /id="(work|skills|experience|projects)"/, path)
    }

    // A project whose optional parts are all empty still renders, with no empty slots.
    let bare: Project = {
      id: 'bare',
      slug: 'bare',
      title: 'Bare project',
      tagline: '',
      stack: [],
      summary: '',
      figures: [],
      blocks: [],
      coverMediaId: null,
      featured: false,
      published: true,
      position: 0,
    }
    await resetStore({ ...snapshot, projects: [bare] })

    let response = await get('/work/bare')
    assert.equal(response.status, 200)
    let html = await response.text()
    assert.match(html, /Bare project/)
    assert.doesNotMatch(html, /<ul[^>]*>\s*<\/ul>/)
    assert.doesNotMatch(html, /<ol[^>]*>\s*<\/ol>/)
    assert.doesNotMatch(html, /<dl[^>]*>\s*<\/dl>/)
    assert.doesNotMatch(html, /<p[^>]*>\s*<\/p>/)
    assert.doesNotMatch(html, /id="story"/)
  })

  it('missing media renders no image', async () => {
    let snapshot = seedCopy()
    let eazy = snapshot.projects.find((project) => project.slug === 'eazycrm')
    assert.ok(eazy)
    eazy.coverMediaId = 'missing-cover'
    eazy.blocks = [...eazy.blocks, { type: 'image', mediaId: 'missing-block' }]
    await resetStore(snapshot)

    for (let path of ['/', '/work', '/work/eazycrm']) {
      let response = await get(path)
      assert.equal(response.status, 200, path)
      let html = await response.text()
      assert.equal(html.includes('missing-cover'), false, path)
      assert.equal(html.includes('missing-block'), false, path)
      assert.doesNotMatch(html, /<img[^>]*\/media\//, path)
    }
  })

  it('no resume link until one is uploaded', async () => {
    await resetStore(seedCopy())

    let html = await (await get('/contact')).text()
    assert.equal(html.includes('/media/'), false)
    assert.doesNotMatch(html, /\bdownload\b/i)
  })

  it('no page shows the phone number', async () => {
    await resetStore(seedCopy())

    for (let path of [...publicPaths, '/work/restaurant-pos', '/work/nope', '/nowhere']) {
      let html = await (await get(path)).text()
      assert.doesNotMatch(html, /9072283042/, path)
    }
  })

  it('never links to the admin area', async () => {
    await resetStore(seedCopy())

    for (let path of publicPaths) {
      let html = await (await get(path)).text()
      assert.equal(html.includes('/admin'), false, path)
    }
  })

  it('GET /media/:id is not found until uploads exist', async () => {
    await resetStore(seedCopy())

    assert.equal((await get('/media/anything')).status, 404)
  })

  it('serves the stylesheet, the tool icons and the app modules', async () => {
    let css = await get('/desk/desk.css')
    assert.equal(css.status, 200)
    assert.match(css.headers.get('Content-Type') ?? '', /text\/css/)

    let icon = await get('/assets/icons/nodejs.svg')
    assert.equal(icon.status, 200)

    let module = await get('/assets/app/actions/public/entry.ts')
    assert.equal(module.status, 200)
    assert.match(module.headers.get('Content-Type') ?? '', /javascript/)
  })

  it('every page carries the theme switch, the ruler and the transition curtain', async () => {
    await resetStore(seedCopy())

    for (let path of publicPaths) {
      let html = await (await get(path)).text()
      assert.match(html, /data-theme-toggle/, path)
      assert.match(html, /data-ruler/, path)
      assert.match(html, /class="curtain"/, path)
    }
  })

  it('the home page has the desk and every doodle, linked to the owner profiles', async () => {
    await resetStore(seedCopy())

    let html = await (await get('/')).text()
    assert.match(html, /data-desk/)
    for (let toy of ['badge', 'sticky', 'sticker', 'mug', 'gears', 'rocket']) {
      assert.match(html, new RegExp(`data-toy="${toy}"`), toy)
    }
    assert.match(html, /href="https:\/\/github\.com\/ali-d-coded"/)
    assert.match(html, /href="https:\/\/linkedin\.com\/in\/ali-afthab"/)
  })

  it('the contact page has the stickers and no badge', async () => {
    await resetStore(seedCopy())

    let html = await (await get('/contact')).text()
    assert.match(html, /data-variant="contact"/)
    assert.doesNotMatch(html, /data-toy="badge"/)
    assert.match(html, /data-toy="sticker"/)
  })

  it('the skills panel and the experience entries carry the tools they use', async () => {
    await resetStore(seedCopy())

    let home = await (await get('/')).text()
    assert.match(home, /data-skill-group=/)
    assert.match(home, /data-timeline-entry=[^>]*data-tools=|data-tools=[^>]*data-timeline-entry=/)
    let about = await (await get('/about')).text()
    assert.match(about, /data-timeline="sticky"/)
    assert.match(about, /data-timeline-link=/)
    let pipeline = await (await get('/work/eazycrm')).text()
    assert.match(pipeline, /data-pipeline/)
  })
})
