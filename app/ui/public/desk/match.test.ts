import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { matches } from './match.ts'

describe('matches', () => {
  it('matches a shared tool ignoring case and space', () => {
    assert.equal(matches(['Node.js', 'Bun'], ['bun ']), true)
    assert.equal(matches(['Go (Golang)'], ['go (golang)']), true)
  })

  it('matches a bracketed name against its plain name', () => {
    assert.equal(matches(['MongoDB (Mongoose)'], ['MongoDB']), true)
    assert.equal(matches(['MongoDB'], ['mongodb (mongoose)']), true)
  })

  it('does not match different tools or empty lists', () => {
    assert.equal(matches(['React'], ['Redis']), false)
    assert.equal(matches([], ['x']), false)
    assert.equal(matches(['x'], []), false)
  })
})
