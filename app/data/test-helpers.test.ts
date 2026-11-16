import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { store } from './store.ts'
import { makeSnapshot } from './store-contract.ts'
import { resetStore } from './test-helpers.ts'

describe('resetStore', () => {
  it('empties the app-wide store and can seed a snapshot', async () => {
    let snapshot = makeSnapshot()

    await resetStore(snapshot)
    assert.equal(await store.isEmpty(), false)

    await resetStore()
    assert.equal(await store.isEmpty(), true)

    await resetStore(snapshot)
    assert.deepEqual(await store.exportAll(), snapshot)

    await resetStore()
  })
})
