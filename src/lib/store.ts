// データの読み書きはこのモジュールにまとめる。
// 将来サーバー保存に差し替える場合は、ここだけを書き換えれば画面側は変えずに済む。

import Dexie, { type EntityTable } from 'dexie'
import { todayString } from './date'
import { DEFAULT_SETTINGS, type Purchase, type Settings } from './types'

interface SettingsRow extends Settings {
  key: 'app'
}

const db = new Dexie('smoke-less') as Dexie & {
  purchases: EntityTable<Purchase, 'id'>
  settings: EntityTable<SettingsRow, 'key'>
}

db.version(1).stores({
  purchases: 'id, date',
  settings: 'key',
})

export async function getSettings(): Promise<Settings> {
  const row = await db.settings.get('app')
  if (!row) return { ...DEFAULT_SETTINGS }
  return { pricePerPack: row.pricePerPack, monthlyGoalPacks: row.monthlyGoalPacks }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await db.settings.put({ key: 'app', ...settings })
}

export async function listPurchases(): Promise<Purchase[]> {
  return db.purchases.toArray()
}

/** 1箱を記録する。日付を省略すると今日。価格は現在の設定値を使う。 */
export async function addPurchase(date: string = todayString()): Promise<Purchase> {
  const { pricePerPack } = await getSettings()
  const purchase: Purchase = {
    id: crypto.randomUUID(),
    date,
    price: pricePerPack,
    createdAt: new Date().toISOString(),
  }
  await db.purchases.add(purchase)
  return purchase
}

export async function deletePurchase(id: string): Promise<void> {
  await db.purchases.delete(id)
}

/** 全データを置き換える（バックアップの読み込み用） */
export async function replaceAll(settings: Settings, purchases: Purchase[]): Promise<void> {
  await db.transaction('rw', db.purchases, db.settings, async () => {
    await db.purchases.clear()
    await db.purchases.bulkAdd(purchases)
    await db.settings.put({ key: 'app', ...settings })
  })
}
