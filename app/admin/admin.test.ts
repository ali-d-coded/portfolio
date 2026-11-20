import * as assert from 'remix/assert'
import { afterEach, beforeEach, describe, it } from 'remix/test'

import { router } from '../router.ts'
import { seedSnapshot } from '../data/seed.ts'
import { resetStore } from '../data/test-helpers.ts'
import { store } from '../data/store.ts'
import { clearFailures } from './auth.ts'
import { formatBlocks, formatFigures, isSafeUrl, parseBlocks, parseFigures, slugify } from './parse.ts'

const ORIGIN = 'http://localhost'

/** `bare` sends a post with none of the headers a browser adds, as a script outside a browser would. */
function request(path: string, init: RequestInit & { cookie?: string; bare?: boolean } = {}) {
  let headers = new Headers(init.headers)
  if (init.cookie) headers.set('cookie', init.cookie)
  if (init.method === 'POST' && !init.bare && !headers.has('origin') && !headers.has('sec-fetch-site')) {
    headers.set('origin', ORIGIN)
  }
  return router.fetch(new Request(new URL(path, ORIGIN), { ...init, headers }))
}

function post(path: string, fields: Record<string, string>, cookie?: string, headers: HeadersInit = {}) {
  let body = new FormData()
  for (let [name, value] of Object.entries(fields)) body.set(name, value)
  return request(path, { method: 'POST', body, cookie, headers })
}

async function login(): Promise<string> {
  let response = await post('/admin/login', { password: 'correct horse' })
  assert.equal(response.status, 303)
  let cookie = response.headers.get('set-cookie') ?? ''
  assert.match(cookie, /HttpOnly/)
  assert.match(cookie, /SameSite=Strict/)
  return cookie.split(';')[0]!
}

describe('admin text formats', () => {
  it('round-trips project blocks', () => {
    let text = '# Overview\n\nFirst line\nsecond line\n\nfigures: 30+ | clients ; 3 | apps\n\nimage: abc'
    let blocks = parseBlocks(text)
    assert.deepEqual(blocks.map((block) => block.type), ['heading', 'text', 'figures', 'image'])
    assert.equal(formatBlocks(blocks), text)
  })

  it('parses figures and skips incomplete lines', () => {
    assert.deepEqual(parseFigures('30+ | clients\nbroken\n | no value'), [{ value: '30+', label: 'clients' }])
    assert.equal(formatFigures([{ value: '3', label: 'apps' }]), '3 | apps')
  })

  it('makes slugs and refuses unsafe links', () => {
    assert.equal(slugify('  My Big Project! '), 'my-big-project')
    assert.equal(isSafeUrl('javascript:alert(1)'), false)
    assert.equal(isSafeUrl('https://example.com'), true)
    assert.equal(isSafeUrl('//evil.com', { allowPath: true }), false)
    assert.equal(isSafeUrl('/media/1', { allowPath: true }), true)
  })
})

describe('admin', () => {
  beforeEach(async () => {
    process.env.ADMIN_PASSWORD = 'correct horse'
    clearFailures()
    await resetStore(structuredClone(seedSnapshot))
  })
  afterEach(() => {
    delete process.env.ADMIN_PASSWORD
  })

  it('does not exist until a password is set', async () => {
    delete process.env.ADMIN_PASSWORD
    assert.equal((await request('/admin')).status, 404)
    assert.equal((await request('/admin/login')).status, 404)
  })

  it('sends visitors to sign in, and refuses a wrong password', async () => {
    let response = await request('/admin')
    assert.equal(response.status, 303)
    assert.equal(response.headers.get('location'), '/admin/login')
    assert.equal((await post('/admin/login', { password: 'nope' })).status, 401)
    assert.equal((await request('/admin/c/projects', { cookie: 'admin=forged' })).status, 303)
  })

  it('shows the dashboard once signed in, with no caching', async () => {
    let cookie = await login()
    let response = await request('/admin', { cookie })
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.match(await response.text(), /Overview/)
  })

  it('rejects posts from another origin', async () => {
    let cookie = await login()
    let response = await post('/admin/site', { name: 'x' }, cookie, { origin: 'https://evil.example' })
    assert.equal(response.status, 403)
  })

  it('edits the site and the public page changes', async () => {
    let cookie = await login()
    let site = (await store.getSite())!
    let response = await post(
      '/admin/site',
      { name: 'Ali Changed', role: site.role, heroHeadline: site.heroHeadline, summary: 'New summary', about: 'About', email: site.email, linkedinUrl: '', githubUrl: '', education: '' },
      cookie,
    )
    assert.equal(response.status, 303)
    assert.match(await (await request('/')).text(), /Ali Changed/)
  })

  it('shows field errors and keeps what was typed', async () => {
    let cookie = await login()
    let response = await post('/admin/c/projects/new', { title: '', liveUrl: 'javascript:alert(1)', summary: 'kept text' }, cookie)
    assert.equal(response.status, 400)
    let html = await response.text()
    assert.match(html, /A title is needed/)
    assert.match(html, /kept text/)
    assert.equal((await store.listProjects()).length, 3)
  })

  it('creates, edits, hides, reorders and deletes a project', async () => {
    let cookie = await login()
    let created = await post(
      '/admin/c/projects/new',
      { title: 'Fresh Project', tagline: 'Tag', summary: 'Sum', stack: 'A, B', blocks: '# Heading\n\nBody', published: 'on' },
      cookie,
    )
    assert.equal(created.status, 303)
    assert.equal(created.headers.get('location'), '/admin/c/projects/fresh-project?saved=1')
    assert.equal((await request('/work/fresh-project')).status, 200)

    // Unchecking "published" hides it from visitors.
    await post('/admin/c/projects/fresh-project', { title: 'Fresh Project', slug: 'fresh-project' }, cookie)
    assert.equal((await request('/work/fresh-project')).status, 404)

    // A taken address is refused.
    let clash = await post('/admin/c/projects/fresh-project', { title: 'Fresh Project', slug: 'eazycrm', published: 'on' }, cookie)
    assert.equal(clash.status, 400)

    await post('/admin/c/projects/fresh-project/move', { dir: 'up' }, cookie)
    let order = (await store.listProjects()).map((project) => project.id)
    assert.equal(order.indexOf('fresh-project'), 2)
    assert.equal(order.length, 4)
    await post('/admin/c/projects/fresh-project/move', { dir: 'up' }, cookie)
    assert.equal((await store.listProjects()).map((project) => project.id).indexOf('fresh-project'), 1)

    await post('/admin/c/projects/fresh-project/delete', {}, cookie)
    assert.equal(await store.getProject('fresh-project'), null)
  })

  it('manages experience and skill groups', async () => {
    let cookie = await login()
    let bad = await post('/admin/c/experience/new', { company: 'Acme', role: 'Dev', start: 'soon' }, cookie)
    assert.equal(bad.status, 400)
    let ok = await post('/admin/c/experience/new', { company: 'Acme', role: 'Dev', start: '2020-01', end: '2021-02', bullets: 'one\ntwo', skills: 'Go, Rust' }, cookie)
    assert.equal(ok.status, 303)
    let added = (await store.listExperience()).find((entry) => entry.company === 'Acme')
    assert.ok(added)
    assert.deepEqual(added.bullets, ['one', 'two'])
    assert.deepEqual(added.skills, ['Go', 'Rust'])

    await post('/admin/c/skills/new', { name: 'Tools', items: 'Git, Docker' }, cookie)
    assert.ok((await store.listSkillGroups()).some((group) => group.name === 'Tools'))
  })

  it('unknown collections are 404', async () => {
    let cookie = await login()
    assert.equal((await request('/admin/c/secrets', { cookie })).status, 404)
  })

  it('uploads a preview image and serves it back', async () => {
    let cookie = await login()
    let body = new FormData()
    body.set('title', 'With Image')
    body.set('published', 'on')
    body.set('previewImageUpload', new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0])], 'shot.png', { type: 'image/png' }))
    let response = await request('/admin/c/projects/new', { method: 'POST', body, cookie })
    assert.equal(response.status, 303)
    let project = await store.getProject('with-image')
    assert.ok(project?.previewImage?.startsWith('/media/'))
    let served = await request(project!.previewImage!)
    assert.equal(served.status, 200)
    assert.equal(served.headers.get('content-type'), 'image/png')
    assert.equal(served.headers.get('x-content-type-options'), 'nosniff')

    let svg = new FormData()
    svg.set('title', 'Bad Image')
    svg.set('previewImageUpload', new File(['<svg onload=alert(1)>'], 'x.svg', { type: 'image/svg+xml' }))
    assert.equal((await request('/admin/c/projects/new', { method: 'POST', body: svg, cookie })).status, 400)
  })

  it('uploads a resume, links it everywhere and replaces it', async () => {
    let cookie = await login()
    let site = (await store.getSite())!
    let fields = { name: site.name, role: site.role, heroHeadline: site.heroHeadline, summary: '', about: '', email: site.email, linkedinUrl: '', githubUrl: '', education: '' }
    function withResume(file: File | null) {
      let body = new FormData()
      for (let [name, value] of Object.entries(fields)) body.set(name, value)
      if (file) body.set('resumeUpload', file)
      return request('/admin/site', { method: 'POST', body, cookie })
    }
    let pdf = (text: string) => new File(['%PDF-1.4 ' + text], 'cv.pdf', { type: 'application/pdf' })

    assert.equal((await withResume(new File(['hello'], 'cv.pdf', { type: 'application/pdf' }))).status, 400)
    assert.equal((await withResume(new File(['x'], 'cv.txt', { type: 'text/plain' }))).status, 400)

    assert.equal((await withResume(pdf('first'))).status, 303)
    let firstId = (await store.getSite())!.resumeMediaId
    assert.ok(firstId)
    for (let path of ['/', '/about', '/contact']) {
      assert.ok((await (await request(path)).text()).includes(`href="/media/${firstId}"`), path)
    }
    let served = await request(`/media/${firstId}`)
    assert.equal(served.headers.get('content-type'), 'application/pdf')

    // Saving with no file keeps it; a new file replaces it and removes the old one.
    await withResume(null)
    assert.equal((await store.getSite())!.resumeMediaId, firstId)
    await withResume(pdf('second'))
    let secondId = (await store.getSite())!.resumeMediaId
    assert.notEqual(secondId, firstId)
    assert.equal(await store.getMedia(firstId!), null)
    assert.equal((await request(`/media/${firstId}`)).status, 404)
  })

  it('refuses a post with no origin, or from another site', async () => {
    let cookie = await login()
    let fields = new FormData()
    fields.set('name', 'x')
    let bare = await request('/admin/site', { method: 'POST', body: fields, cookie, bare: true })
    assert.equal(bare.status, 403)
    let cross = await request('/admin/site', { method: 'POST', body: fields, cookie, headers: { 'sec-fetch-site': 'cross-site' } })
    assert.equal(cross.status, 403)
    let loginCross = await post('/admin/login', { password: 'correct horse' }, undefined, { origin: 'https://evil.example' })
    assert.equal(loginCross.status, 403)
  })

  it('signing out ends the session on the server', async () => {
    let cookie = await login()
    assert.equal((await request('/admin', { cookie })).status, 200)
    await post('/admin/logout', {}, cookie)
    // The old cookie, replayed, no longer works.
    assert.equal((await request('/admin', { cookie })).status, 303)
  })

  it('each login gets its own unguessable token', async () => {
    let first = await login()
    let second = await login()
    assert.notEqual(first, second)
    assert.ok(first.split('=')[1]!.length >= 40)
  })

  it('pauses logins after repeated wrong passwords, even for the right one', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      assert.equal((await post('/admin/login', { password: 'wrong' + attempt })).status, 401)
    }
    assert.equal((await post('/admin/login', { password: 'correct horse' })).status, 429)
    // Another client is not held up by it.
    let other = await post('/admin/login', { password: 'correct horse' }, undefined, { 'x-forwarded-for': '203.0.113.9' })
    assert.equal(other.status, 303)
  })

  it('stays off when the password is short', async () => {
    process.env.ADMIN_PASSWORD = 'short'
    assert.equal((await request('/admin/login')).status, 404)
    assert.equal((await post('/admin/login', { password: 'short' })).status, 404)
  })

  it('locks down every admin response and sends security headers sitewide', async () => {
    let page = await request('/admin/login')
    let csp = page.headers.get('content-security-policy') ?? ''
    assert.match(csp, /default-src 'none'/)
    assert.match(csp, /frame-ancestors 'none'/)
    assert.doesNotMatch(csp, /script-src|unsafe-inline|unsafe-eval/)
    assert.equal(page.headers.get('x-frame-options'), 'DENY')
    assert.equal(page.headers.get('cache-control'), 'no-store')
    assert.equal(page.headers.get('referrer-policy'), 'no-referrer')
    assert.equal(page.headers.get('x-content-type-options'), 'nosniff')
    assert.doesNotMatch(await page.text(), /<script/)

    let redirected = await request('/admin')
    assert.equal(redirected.headers.get('cache-control'), 'no-store')

    let home = await request('/')
    assert.equal(home.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(home.headers.get('referrer-policy'), 'strict-origin-when-cross-origin')
  })

  it('rejects an upload whose bytes are not what it claims', async () => {
    let cookie = await login()
    for (let [name, type, content] of [
      ['a.png', 'image/png', '<script>alert(1)</script>'],
      ['b.jpg', 'image/jpeg', 'GIF89a....'],
    ] as const) {
      let body = new FormData()
      body.set('title', 'Fake ' + name)
      body.set('previewImageUpload', new File([content], name, { type }))
      let response = await request('/admin/c/projects/new', { method: 'POST', body, cookie })
      assert.equal(response.status, 400, name)
      assert.match(await response.text(), /not a real image/)
    }
  })

  it('rejects an oversized field and a malformed email', async () => {
    let cookie = await login()
    let huge = await post('/admin/c/projects/new', { title: 'T', summary: 'x'.repeat(40_000) }, cookie)
    assert.equal(huge.status, 413)
    let site = (await store.getSite())!
    let base = { name: site.name, role: site.role, heroHeadline: site.heroHeadline, summary: '', about: '', linkedinUrl: '', githubUrl: '', education: '' }
    for (let email of ['a@b.co?bcc=evil@x.io', 'a b@c.io', '"><x@y.io']) {
      assert.equal((await post('/admin/site', { ...base, email }, cookie)).status, 400, email)
    }
    assert.equal((await post('/admin/site', { ...base, email: 'ok.name+tag@example.com' }, cookie)).status, 303)
  })

  it('escapes what is typed into a page, in the admin and on the site', async () => {
    let cookie = await login()
    let attack = '<img src=x onerror=alert(1)>'
    let created = await post('/admin/c/projects/new', { title: attack, slug: 'xss', summary: attack, blocks: attack, published: 'on' }, cookie)
    assert.equal(created.status, 303)
    for (let path of ['/work/xss', '/work', '/', '/admin/c/projects/xss', '/admin/c/projects']) {
      let html = await (await request(path, { cookie })).text()
      assert.equal(html.includes('<img src=x'), false, path)
    }
  })

  it('downloads a backup', async () => {
    let cookie = await login()
    let response = await request('/admin/backup', { cookie })
    assert.match(response.headers.get('content-disposition') ?? '', /attachment/)
    assert.equal(JSON.parse(await response.text()).version, 1)
  })
})
