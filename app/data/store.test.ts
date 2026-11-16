import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createContentStore } from './store.ts'

describe('createContentStore', () => {
  it('rejects an unknown CONTENT_STORE', async () => {
    await assert.rejects(
      () => createContentStore({ CONTENT_STORE: 'mongo' }),
      /Unknown CONTENT_STORE: mongo/,
    )
  })

  it('defaults to an in-memory sqlite store under NODE_ENV=test', async () => {
    let store = await createContentStore({ NODE_ENV: 'test' })
    try {
      assert.equal(await store.isEmpty(), true)
    } finally {
      await store.close()
    }
  })
})
