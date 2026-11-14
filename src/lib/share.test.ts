import { describe, expect, it } from 'vitest'
import { shareIdFromHash } from './share'

describe('共有リンク', () => {
  it('# から共有IDを取り出す', () => {
    expect(shareIdFromHash('#/v/AbCdEfGhIjKlMnOpQrSt_-')).toBe('AbCdEfGhIjKlMnOpQrSt_-')
  })
  it('閲覧用リンクでなければ null', () => {
    expect(shareIdFromHash('')).toBeNull()
    expect(shareIdFromHash('#/v/short')).toBeNull()
    expect(shareIdFromHash('#/v/AbCdEfGhIjKlMnOpQrSt_-/extra')).toBeNull()
    expect(shareIdFromHash('#/x/AbCdEfGhIjKlMnOpQrSt_-')).toBeNull()
  })
})
