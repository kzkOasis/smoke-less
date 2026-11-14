import { useEffect, useRef, useState } from 'react'
import { Card, CardLabel } from '../components/ui'
import {
  compareWithPreviousMonth,
  daySummary,
  monthSummary,
  remainingToGoal,
  totalSummary,
} from '../lib/aggregate'
import { formatFullDay, monthKey, todayString } from '../lib/date'
import { formatYen } from '../lib/format'
import { addPurchase, deletePurchase } from '../lib/store'
import type { Purchase, Settings } from '../lib/types'

const UNDO_MS = 5000

export function Home({ purchases, settings }: { purchases: Purchase[]; settings: Settings }) {
  const today = todayString()
  const day = daySummary(purchases, today)
  const month = monthSummary(purchases, monthKey(today))
  const total = totalSummary(purchases)
  const remaining = remainingToGoal(settings.monthlyGoalPacks, month.packs)
  const comparison = compareWithPreviousMonth(purchases, today)

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
      <p className="text-sub text-sm">{formatFullDay(today)}</p>

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

      <div className="grid gap-3">
        <Card>
          <CardLabel>今月</CardLabel>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="tabular text-2xl font-bold">{formatYen(month.amount)}</p>
            <p className="tabular text-sub text-sm">{month.packs}箱</p>
          </div>
          {remaining !== null && (
            <p className="text-accent mt-2 text-sm font-medium">
              {remaining === 0
                ? `今月の目標（${settings.monthlyGoalPacks}箱）ちょうどです`
                : `目標まであと${remaining}箱`}
            </p>
          )}
          {comparison && <Comparison packsDiff={comparison.packsDiff} amountDiff={comparison.amountDiff} previousPacks={comparison.previous.packs} />}
        </Card>

        <Card>
          <CardLabel>累計</CardLabel>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="tabular text-2xl font-bold">{formatYen(total.amount)}</p>
            <p className="tabular text-sub text-sm">{total.packs}箱</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

/**
 * 前月比。減っている時だけ強調し、増えている時は評価を付けず数字だけを出す。
 */
function Comparison({
  packsDiff,
  amountDiff,
  previousPacks,
}: {
  packsDiff: number
  amountDiff: number
  previousPacks: number
}) {
  if (packsDiff < 0) {
    const saved = amountDiff < 0 ? `、${formatYen(-amountDiff)}浮きました` : ''
    return (
      <p className="bg-accent-soft text-accent mt-3 rounded-lg px-3 py-2 text-sm font-medium">
        先月の同じ日より{-packsDiff}箱少ない{saved}
      </p>
    )
  }
  return (
    <p className="text-sub tabular mt-3 text-sm">
      {packsDiff === 0 ? '先月の同じ日までと同じ：' : '先月の同じ日まで：'}
      {previousPacks}箱
    </p>
  )
}
