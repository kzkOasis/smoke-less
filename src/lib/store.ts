// データの読み書きはこのモジュールにまとめる。
// 将来サーバー保存に差し替える場合は、ここだけを書き換えれば画面側は変えずに済む。

import Dexie, { type EntityTable } from 'dexie'
import { todayString } from './date'
import { DEFAULT_SETTINGS, type Purchase, type Settings } from './types'

interface SettingsRow extends Settings {
  key: 'app'
}

/** 家族との共有の状態。共有していない時は行そのものが無い。 */
export interface ShareConfig {
  /** 共有リンクに含まれるID */
  id: string
  /** サーバー上の記録を更新・削除するための鍵。この端末の外には出さない */
  writeKey: string
  /** 最後にサーバーへ送れた日時（ISO 8601） */
  lastSyncedAt: string | null
}

interface ShareRow extends ShareConfig {
  key: 'share'
}

type Listener = () => void
const listeners = new Set<Listener>()

/** 記録か設定が変わった時に呼ばれる。共有の同期が購読する。 */
export function onDataChange(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const notify = () => listeners.forEach((l) => l())

const db = new Dexie('smoke-less') as Dexie & {
  purchases: EntityTable<Purchase, 'id'>
  settings: EntityTable<SettingsRow | ShareRow, 'key'>
}

db.version(1).stores({
  purchases: 'id, date',
  settings: 'key',
})

export async function getSettings(): Promise<Settings> {
  const row = await db.settings.get('app')
  if (!row || row.key !== 'app') return { ...DEFAULT_SETTINGS }
  return { pricePerPack: row.pricePerPack, monthlyGoalPacks: row.monthlyGoalPacks }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await db.settings.put({ key: 'app', ...settings })
  notify()
}

export async function getShareConfig(): Promise<ShareConfig | null> {
  const row = await db.settings.get('share')
  if (!row || row.key !== 'share') return null
  return { id: row.id, writeKey: row.writeKey, lastSyncedAt: row.lastSyncedAt }
}

export async function saveShareConfig(config: ShareConfig | null): Promise<void> {
  if (config) await db.settings.put({ key: 'share', ...config })
  else await db.settings.delete('share')
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
  notify()
  return purchase
}

export async function deletePurchase(id: string): Promise<void> {
  await db.purchases.delete(id)
  notify()
}

/** 全データを置き換える（バックアップの読み込み用） */
export async function replaceAll(settings: Settings, purchases: Purchase[]): Promise<void> {
  await db.transaction('rw', db.purchases, db.settings, async () => {
    await db.purchases.clear()
    await db.purchases.bulkAdd(purchases)
    await db.settings.put({ key: 'app', ...settings })
  })
  notify()
}
