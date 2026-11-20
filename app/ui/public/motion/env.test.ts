import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { parseSpeed } from './env.ts'

describe('parseSpeed', () => {
  it('reads speeds in range', () => {
    assert.equal(parseSpeed('0.3'), 0.3)
    assert.equal(parseSpeed('-0.5'), -0.5)
  })

  it('returns 0 for out of range, non-numeric or missing values', () => {
    assert.equal(parseSpeed('2'), 0)
    assert.equal(parseSpeed('x'), 0)
    assert.equal(parseSpeed(null), 0)
  })
})
