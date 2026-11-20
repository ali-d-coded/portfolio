import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { formatFigure, parseFigure } from './figure.ts'

describe('parseFigure', () => {
  it('splits a number from its suffix', () => {
    assert.deepEqual(parseFigure('30+'), { prefix: '', number: 30, decimals: 0, suffix: '+' })
    assert.deepEqual(parseFigure('1.5k'), { prefix: '', number: 1.5, decimals: 1, suffix: 'k' })
  })

  it('returns null when there is no number', () => {
    assert.equal(parseFigure('many'), null)
    assert.equal(parseFigure(''), null)
  })
})

describe('formatFigure', () => {
  it('scales the number and keeps the suffix', () => {
    let parsed = parseFigure('30+')!
    assert.equal(formatFigure(parsed, 0), '0+')
    assert.equal(formatFigure(parsed, 0.5), '15+')
    assert.equal(formatFigure(parsed, 1), '30+')
  })
})
