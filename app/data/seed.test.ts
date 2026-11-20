import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { seedIfEmpty, seedSnapshot } from './seed.ts'
import { store } from './store.ts'
import { resetStore } from './test-helpers.ts'

describe('seedIfEmpty', () => {
  it('seeds an empty store', async () => {
    await resetStore()

    assert.equal(await seedIfEmpty(store), true)
    assert.equal((await store.listProjects()).length, 3)
    assert.equal((await store.listExperience()).length, 4)
    assert.equal((await store.listSkillGroups()).length, 9)
    assert.equal((await store.getSite())?.email, 'aliallu3xa@gmail.com')

    await resetStore()
  })

  it('never overwrites', async () => {
    await resetStore()
    await seedIfEmpty(store)

    let site = await store.getSite()
    assert.ok(site)
    await store.saveSite({ ...site, name: 'Changed Name' })

    assert.equal(await seedIfEmpty(store), false)
    assert.equal((await store.getSite())?.name, 'Changed Name')

    await resetStore()
  })

  it('has no phone number', () => {
    assert.equal(/9072283042/.test(JSON.stringify(seedSnapshot)), false)
  })
})
