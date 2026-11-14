import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings, getShareConfig, listPurchases, type ShareConfig } from './store'
import type { Purchase, Settings } from './types'

/** 記録と設定を購読する。読み込み中は undefined。 */
export function useData():
  | { purchases: Purchase[]; settings: Settings; share: ShareConfig | null }
  | undefined {
  return useLiveQuery(async () => {
    const [purchases, settings, share] = await Promise.all([
      listPurchases(),
      getSettings(),
      getShareConfig(),
    ])
    return { purchases, settings, share }
  }, [])
}
