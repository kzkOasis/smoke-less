import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import {
  addPurchase,
  deletePurchase,
  getSettings,
  listPurchases,
  replaceAll,
  saveSettings,
} from './store'

describe('保存', () => {
  it('初期設定は600円・目標なし', async () => {
    expect(await getSettings()).toEqual({ pricePerPack: 600, monthlyGoalPacks: null })
  })

  it('記録は、その時点の価格を保持する', async () => {
    const first = await addPurchase('2026-11-01')
    await saveSettings({ pricePerPack: 650, monthlyGoalPacks: 20 })
    const second = await addPurchase('2026-11-02')

    expect(first.price).toBe(600)
    expect(second.price).toBe(650)
    const all = await listPurchases()
    expect(all.find((p) => p.id === first.id)?.price).toBe(600)
  })

  it('取り消し（削除）できる', async () => {
    const added = await addPurchase('2026-11-03')
    await deletePurchase(added.id)
    expect((await listPurchases()).some((p) => p.id === added.id)).toBe(false)
  })

  it('全データを置き換えられる', async () => {
    await replaceAll({ pricePerPack: 700, monthlyGoalPacks: null }, [
      { id: 'z', date: '2026-01-01', price: 700, createdAt: '2026-01-01T00:00:00.000Z' },
    ])
    expect(await listPurchases()).toHaveLength(1)
    expect((await getSettings()).pricePerPack).toBe(700)
  })
})
