// 家族との共有。
// 記録は今までどおり端末内に保存し、共有がオンの間だけ、同じ内容をサーバーにも送る。
// 家族は共有リンクを開いて、その内容を見るだけ（書き換えはできない）。

import {
  getSettings,
  getShareConfig,
  listPurchases,
  onDataChange,
  saveShareConfig,
  type ShareConfig,
} from './store'
import type { Purchase, Settings } from './types'

const API = '/api/share'
const SYNC_DELAY_MS = 1500

export interface Snapshot {
  settings: Settings
  purchases: Purchase[]
}

export interface SharedData extends Snapshot {
  updatedAt: string
}

async function currentSnapshot(): Promise<Snapshot> {
  const [settings, purchases] = await Promise.all([getSettings(), listPurchases()])
  return { settings, purchases }
}

/** 共有リンク。IDは # の後ろに置く。 */
export function shareLink(id: string): string {
  return `${location.origin}/#/v/${id}`
}

/** URLの # から共有IDを取り出す。閲覧用リンクでなければ null。 */
export function shareIdFromHash(hash: string): string | null {
  const m = /^#\/v\/([A-Za-z0-9_-]{22})$/.exec(hash)
  return m ? m[1] : null
}

/** 共有を始める。サーバーに記録を送り、リンク用のIDを受け取る。 */
export async function startSharing(): Promise<ShareConfig> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ snapshot: await currentSnapshot() }),
  })
  if (!res.ok) throw new Error(`share start failed: ${res.status}`)
  const { id, writeKey } = (await res.json()) as { id: string; writeKey: string }
  const config: ShareConfig = { id, writeKey, lastSyncedAt: new Date().toISOString() }
  await saveShareConfig(config)
  return config
}

/** 共有をやめる。サーバー上の記録を消してから、端末側の共有設定を消す。 */
export async function stopSharing(): Promise<void> {
  const config = await getShareConfig()
  if (!config) return
  const res = await fetch(`${API}?id=${config.id}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${config.writeKey}` },
  })
  // 404 はすでにサーバー側に無い状態なので、やめられたものとして扱う
  if (!res.ok && res.status !== 404) throw new Error(`share stop failed: ${res.status}`)
  await saveShareConfig(null)
}

export type SyncResult = 'synced' | 'off' | 'failed'

/** いまの記録をサーバーに送る。共有していなければ何もしない。 */
export async function syncNow(): Promise<SyncResult> {
  const config = await getShareConfig()
  if (!config) return 'off'
  try {
    const res = await fetch(`${API}?id=${config.id}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.writeKey}`,
      },
      body: JSON.stringify({ snapshot: await currentSnapshot() }),
    })
    if (!res.ok) return 'failed'
    // 送信中に共有をやめていた場合は、設定を書き戻さない
    if (await getShareConfig()) {
      await saveShareConfig({ ...config, lastSyncedAt: new Date().toISOString() })
    }
    return 'synced'
  } catch {
    return 'failed'
  }
}

let timer: number | undefined
let started = false

/**
 * 自動同期を始める。起動時、記録や設定が変わった時、オンラインに戻った時に送る。
 * 送れなかった分は、次にオンラインになった時か次回の起動時にまとめて送られる。
 */
export function startAutoSync(): void {
  if (started) return
  started = true
  const schedule = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => void syncNow(), SYNC_DELAY_MS)
  }
  onDataChange(schedule)
  window.addEventListener('online', () => void syncNow())
  void syncNow()
}

export type FetchResult =
  | { status: 'ok'; data: SharedData }
  | { status: 'not-found' }
  | { status: 'error' }

/** 家族側：共有された記録を読む。 */
export async function fetchShared(id: string): Promise<FetchResult> {
  try {
    const res = await fetch(`${API}?id=${id}`, { cache: 'no-store' })
    if (res.status === 404 || res.status === 400) return { status: 'not-found' }
    if (!res.ok) return { status: 'error' }
    const body = (await res.json()) as { updatedAt: string; snapshot: Snapshot }
    return { status: 'ok', data: { updatedAt: body.updatedAt, ...body.snapshot } }
  } catch {
    return { status: 'error' }
  }
}
