import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { formatGains, formatScreens, formatStages, parseGains, parseScreens, parseStages } from './admin/parse.ts'
import { seedSnapshot } from './data/seed.ts'
import { resetStore } from './data/test-helpers.ts'
import { store } from './data/store.ts'
import { router } from './router.ts'

async function page(path: string) {
  return (await router.fetch(new Request(`http://localhost${path}`))).text()
}

describe('project case study', () => {
  it('EazyCRM shows what a business gets and the route of a message, in order', async () => {
    await resetStore(structuredClone(seedSnapshot))
    let html = await page('/work/eazycrm')
    assert.match(html, /What a business gets from EazyCRM/)
    assert.equal((html.match(/class="route__stop"/g) ?? []).length, 7)
    assert.match(html, /data-route-replay/)
    assert.match(html, /Under the hood/)
    // The sections follow the hero in the order a client reads them.
    let order = ['id="gets"', 'id="route"', 'id="story"', 'id="live"'].map((marker) => html.indexOf(marker))
    assert.deepEqual([...order].sort((a, b) => a - b), order)
    assert.ok(order.every((position) => position > 0))
    // Without script every stop still carries its sentence.
    assert.match(html, /class="route__why"/)
  })

  it('renders no screenshots section until screenshots are supplied, never an empty slot', async () => {
    await resetStore(structuredClone(seedSnapshot))
    assert.doesNotMatch(await page('/work/eazycrm'), /id="screens"|class="shots"/)

    let project = (await store.getProject('eazycrm'))!
    project.screens = [
      { device: 'web', label: 'Team inbox', image: '/media/abc' },
      { device: 'mobile', label: 'Agent app', image: '/media/def' },
    ]
    await store.saveProject(project)
    let html = await page('/work/eazycrm')
    assert.match(html, /id="screens"/)
    assert.match(html, /shot--web/)
    assert.match(html, /shot--mobile/)
    assert.match(html, /alt="Team inbox screen of EazyCRM"/)
  })

  it('a project with none of the case study data keeps the plain page', async () => {
    await resetStore(structuredClone(seedSnapshot))
    let html = await page('/work/restaurant-pos')
    assert.doesNotMatch(html, /id="gets"|id="route"|id="screens"/)
    assert.match(html, /What I built on Restaurant POS Platform/)
  })

  it('the admin text formats round-trip and drop bad lines', () => {
    let gains = parseGains('One inbox | The team answers from one place\nno separator\n| no title')
    assert.deepEqual(gains, [{ title: 'One inbox', text: 'The team answers from one place' }])
    assert.equal(formatGains(gains), 'One inbox | The team answers from one place')

    let stages = parseStages('Queue | Safe ingestion | Redis | Nothing is lost\nbroken | line')
    assert.deepEqual(stages, [{ name: 'Queue', line: 'Safe ingestion', tool: 'Redis', benefit: 'Nothing is lost' }])
    assert.equal(formatStages(stages), 'Queue | Safe ingestion | Redis | Nothing is lost')

    let screens = parseScreens('web | Inbox | /media/1\nphone | Wrong device | /media/2\nmobile | Unsafe | javascript:alert(1)\nadmin | Admin | https://example.com/a.png')
    assert.deepEqual(screens, [
      { device: 'web', label: 'Inbox', image: '/media/1' },
      { device: 'admin', label: 'Admin', image: 'https://example.com/a.png' },
    ])
    assert.equal(formatScreens(screens).split('\n').length, 2)
  })
})
