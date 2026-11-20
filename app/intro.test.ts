import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { seedSnapshot } from './data/seed.ts'
import { resetStore } from './data/test-helpers.ts'
import { router } from './router.ts'

async function html(path: string) {
  return (await router.fetch(new Request(`http://localhost${path}`))).text()
}

describe('loading reveal', () => {
  it('is on the home page only, and starts hidden', async () => {
    await resetStore(structuredClone(seedSnapshot))
    let home = await html('/')
    assert.match(home, /data-intro=""/)
    assert.match(home, /opening__rocket/)
    assert.match(home, /data-intro-fire/)
    for (let path of ['/work', '/about', '/contact', '/work/eazycrm']) {
      assert.doesNotMatch(await html(path), /data-intro=""/, path)
    }
    // Hidden until the boot script adds `intro` to the page.
    let css = await (await router.fetch(new Request('http://localhost/desk/desk.css'))).text()
    assert.match(css, /\.opening \{[^}]*display: none/)
    assert.match(css, /html\.intro \.opening \{ display: grid/)
    // The page's own `intro` flag must not match the cover's styles (that once hid the whole page).
    assert.doesNotMatch(css, /(^|\n)\.intro[ {_.:]/)
  })

  it('is decided per tab: sessionStorage, never for reduced motion, never when arriving by a page transition', async () => {
    let home = await html('/')
    let script = home.match(/<script>(\(function\(\)\{var d=document[\s\S]*?)<\/script>/)![1]!
    assert.match(script, /location\.pathname==='\/'/)
    assert.match(script, /sessionStorage\.getItem\('intro'\)/)
    assert.match(script, /sessionStorage\.setItem\('intro','1'\)/)
    assert.match(script, /prefers-reduced-motion/)
    assert.match(script, /!sessionStorage\.getItem\('arrive'\)/)
    // A failsafe clears the cover whatever happens to the scripts.
    assert.match(script, /d\.classList\.remove\('intro'\)/)
  })

  it('runs the boot script as the page would: first visit in a tab only', async () => {
    let home = await html('/')
    let script = home.match(/<script>(\(function\(\)\{var d=document[\s\S]*?)<\/script>/)![1]!

    function run(storage: Map<string, string>, path = '/', reduced = false) {
      let classes = new Set<string>()
      let timers: Array<() => void> = []
      let fake = {
        document: { documentElement: { dataset: {} as Record<string, string>, classList: { add: (name: string) => classes.add(name), remove: (name: string) => classes.delete(name) } } },
        localStorage: { getItem: () => null },
        sessionStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => void storage.set(key, value) },
        location: { pathname: path },
        matchMedia: (query: string) => ({ matches: reduced && query.includes('reduce') }),
        setTimeout: (fn: () => void) => void timers.push(fn),
      }
      new Function('document', 'localStorage', 'sessionStorage', 'location', 'matchMedia', 'setTimeout', script)(
        fake.document,
        fake.localStorage,
        fake.sessionStorage,
        fake.location,
        fake.matchMedia,
        fake.setTimeout,
      )
      return classes
    }

    let tab = new Map<string, string>()
    assert.ok(run(tab).has('intro'), 'first visit plays')
    assert.ok(!run(tab).has('intro'), 'a reload or return in the same tab does not')
    assert.ok(run(new Map()).has('intro'), 'a new tab plays again')
    assert.ok(!run(new Map(), '/work').has('intro'), 'only the home page')
    assert.ok(!run(new Map(), '/', true).has('intro'), 'not with reduced motion')
    assert.ok(!run(new Map([['arrive', '1']])).has('intro'), 'not when arriving through a page transition')
  })
})
