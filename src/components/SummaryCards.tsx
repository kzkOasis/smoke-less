import { compareWithPreviousMonth, monthSummary, remainingToGoal, totalSummary } from '../lib/aggregate'
import { monthKey } from '../lib/date'
import { formatYen } from '../lib/format'
import type { Purchase, Settings } from '../lib/types'
import { Card, CardLabel } from './ui'

/** 今月と累計のカード。本人のホームと、家族の閲覧画面の両方で使う。 */
export function SummaryCards({
  purchases,
  settings,
  today,
}: {
  purchases: Purchase[]
  settings: Settings
  today: string
}) {
  const month = monthSummary(purchases, monthKey(today))
  const total = totalSummary(purchases)
  const remaining = remainingToGoal(settings.monthlyGoalPacks, month.packs)
  const comparison = compareWithPreviousMonth(purchases, today)

  return (
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
        {comparison && (
          <Comparison
            packsDiff={comparison.packsDiff}
            amountDiff={comparison.amountDiff}
            previousPacks={comparison.previous.packs}
          />
        )}
      </Card>

      <Card>
        <CardLabel>累計</CardLabel>
        <div className="mt-1 flex items-baseline justify-between">
          <p className="tabular text-2xl font-bold">{formatYen(total.amount)}</p>
          <p className="tabular text-sub text-sm">{total.packs}箱</p>
        </div>
      </Card>
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
