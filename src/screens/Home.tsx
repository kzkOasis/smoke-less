import { useEffect, useRef, useState } from 'react'
import { SummaryCards } from '../components/SummaryCards'
import { daySummary } from '../lib/aggregate'
import { formatFullDay, todayString } from '../lib/date'
import { addPurchase, deletePurchase } from '../lib/store'
import type { Purchase, Settings } from '../lib/types'

const UNDO_MS = 5000

export function Home({
  purchases,
  settings,
  sharing,
}: {
  purchases: Purchase[]
  settings: Settings
  /** 家族と共有中かどうか。共有中は本人に必ず見えるようにする */
  sharing: boolean
}) {
  const today = todayString()
  const day = daySummary(purchases, today)

  // 直前の記録。5秒間だけ取り消せる。
  const [lastId, setLastId] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const record = async () => {
    const added = await addPurchase()
    setLastId(added.id)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setLastId(null), UNDO_MS)
  }

  const undo = async () => {
    if (!lastId) return
    window.clearTimeout(timer.current)
    await deletePurchase(lastId)
    setLastId(null)
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between">
        <p className="text-sub text-sm">{formatFullDay(today)}</p>
        {sharing && (
          <p className="bg-accent-soft text-accent rounded-full px-3 py-1 text-xs font-medium">
            家族と共有中
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-8">
        <button
          type="button"
          onClick={record}
          className="bg-accent flex h-44 w-44 flex-col items-center justify-center rounded-full text-white shadow-[0_10px_30px_-10px_rgba(47,111,94,0.7)] transition-transform active:scale-95"
        >
          <span className="text-4xl font-bold">＋1箱</span>
          <span className="mt-1 text-xs opacity-80">買ったら押す</span>
        </button>

        <p className="mt-6 text-sm">
          <span className="text-sub">今日</span>
          <span className="tabular mx-2 text-2xl font-bold">{day.packs}</span>
          <span className="text-sub">箱</span>
        </p>

        <div className="mt-3 h-10" aria-live="polite">
          {lastId && (
            <div className="bg-ink flex items-center gap-4 rounded-full py-2 pr-2 pl-4 text-sm text-white">
              記録しました
              <button
                type="button"
                onClick={undo}
                className="rounded-full bg-white/15 px-3 py-1 font-semibold"
              >
                取り消す
              </button>
            </div>
          )}
        </div>
      </div>

      <SummaryCards purchases={purchases} settings={settings} today={today} />
    </div>
  )
}
