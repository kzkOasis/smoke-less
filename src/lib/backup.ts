import { DEFAULT_SETTINGS, type Purchase, type Settings } from './types'

export const BACKUP_VERSION = 1

export interface Backup {
  version: number
  exportedAt: string
  settings: Settings
  purchases: Purchase[]
}

export function createBackup(settings: Settings, purchases: Purchase[]): Backup {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    purchases,
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isPositiveInt = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v > 0

/**
 * バックアップファイルの中身を検証して取り出す。
 * 形式が合わない場合は Error を投げる。
 */
export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('バックアップファイルとして読み込めませんでした。')
  }
  if (!isRecord(data) || !Array.isArray(data.purchases) || !isRecord(data.settings)) {
    throw new Error('このアプリのバックアップファイルではないようです。')
  }
  if (data.version !== BACKUP_VERSION) {
    throw new Error('対応していないバージョンのバックアップです。')
  }

  const s = data.settings
  const settings: Settings = {
    pricePerPack: isPositiveInt(s.pricePerPack) ? s.pricePerPack : DEFAULT_SETTINGS.pricePerPack,
    monthlyGoalPacks: isPositiveInt(s.monthlyGoalPacks) ? s.monthlyGoalPacks : null,
  }

  const seen = new Set<string>()
  const purchases: Purchase[] = data.purchases.map((p: unknown) => {
    if (
      !isRecord(p) ||
      typeof p.id !== 'string' ||
      typeof p.date !== 'string' ||
      !DATE_RE.test(p.date) ||
      !isPositiveInt(p.price) ||
      typeof p.createdAt !== 'string' ||
      seen.has(p.id)
    ) {
      throw new Error('バックアップの記録に壊れたデータが含まれています。')
    }
    seen.add(p.id)
    return { id: p.id, date: p.date, price: p.price, createdAt: p.createdAt }
  })

  return {
    version: BACKUP_VERSION,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    settings,
    purchases,
  }
}
