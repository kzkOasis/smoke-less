import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings, listPurchases } from './store'
import type { Purchase, Settings } from './types'

/** 記録と設定を購読する。読み込み中は undefined。 */
export function useData(): { purchases: Purchase[]; settings: Settings } | undefined {
  return useLiveQuery(async () => {
    const [purchases, settings] = await Promise.all([listPurchases(), getSettings()])
    return { purchases, settings }
  }, [])
}
