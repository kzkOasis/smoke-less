import { describe, expect, it } from 'vitest'
import { createBackup, parseBackup } from './backup'
import type { Purchase } from './types'

const purchases: Purchase[] = [
  { id: 'a', date: '2026-11-01', price: 600, createdAt: '2026-11-01T01:00:00.000Z' },
  { id: 'b', date: '2026-11-02', price: 620, createdAt: '2026-11-02T01:00:00.000Z' },
]

describe('バックアップ', () => {
  it('書き出したものを読み込むと元に戻る', () => {
    const settings = { pricePerPack: 620, monthlyGoalPacks: 20 }
    const restored = parseBackup(JSON.stringify(createBackup(settings, purchases)))
    expect(restored.settings).toEqual(settings)
    expect(restored.purchases).toEqual(purchases)
  })

  it('目標なし（null）も保たれる', () => {
    const text = JSON.stringify(createBackup({ pricePerPack: 600, monthlyGoalPacks: null }, []))
    expect(parseBackup(text).settings.monthlyGoalPacks).toBeNull()
  })

  it('JSONでないファイルは拒否する', () => {
    expect(() => parseBackup('こんにちは')).toThrow()
  })

  it('別形式のJSONは拒否する', () => {
    expect(() => parseBackup('{"foo":1}')).toThrow()
  })

  it('壊れた記録が含まれていれば拒否する', () => {
    const bad = { ...createBackup({ pricePerPack: 600, monthlyGoalPacks: null }, purchases) }
    const text = JSON.stringify({ ...bad, purchases: [{ id: 'x', date: '11/1', price: 600 }] })
    expect(() => parseBackup(text)).toThrow()
  })
})
