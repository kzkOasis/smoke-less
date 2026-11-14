// 集計ロジック。画面から切り離した純粋関数だけを置く。
// 金額はすべて、記録に保存された price の合計で求める（設定の価格を掛け直さない）。

import { addMonths, dayOf, daysInMonth, monthKey, monthRange } from './date'
import type { Purchase } from './types'

export interface Summary {
  packs: number
  amount: number
}

const sum = (list: Purchase[]): Summary => ({
  packs: list.length,
  amount: list.reduce((acc, p) => acc + p.price, 0),
})

/** 指定した日の箱数と金額 */
export function daySummary(purchases: Purchase[], date: string): Summary {
  return sum(purchases.filter((p) => p.date === date))
}

/** 指定した月（YYYY-MM）の箱数と金額 */
export function monthSummary(purchases: Purchase[], ym: string): Summary {
  return sum(purchases.filter((p) => monthKey(p.date) === ym))
}

/** 全期間の箱数と金額 */
export function totalSummary(purchases: Purchase[]): Summary {
  return sum(purchases)
}

/**
 * 目標までの残り箱数。
 * 目標が未設定、または目標を超えている場合は null（残り表示を出さない）。
 */
export function remainingToGoal(goal: number | null, packs: number): number | null {
  if (goal === null) return null
  const remaining = goal - packs
  return remaining < 0 ? null : remaining
}

export interface MonthComparison {
  /** 今月1日〜今日 */
  current: Summary
  /** 先月1日〜同じ日（先月に同じ日がなければ月末まで） */
  previous: Summary
  /** current − previous。マイナスなら先月より少ない */
  packsDiff: number
  amountDiff: number
}

/**
 * 前月比。先月の記録が1件もない場合は null（表示しない）。
 */
export function compareWithPreviousMonth(
  purchases: Purchase[],
  today: string,
): MonthComparison | null {
  const thisMonth = monthKey(today)
  const lastMonth = addMonths(thisMonth, -1)
  if (!purchases.some((p) => monthKey(p.date) === lastMonth)) return null

  const day = dayOf(today)
  const lastDay = Math.min(day, daysInMonth(lastMonth))
  const current = sum(
    purchases.filter((p) => monthKey(p.date) === thisMonth && dayOf(p.date) <= day),
  )
  const previous = sum(
    purchases.filter((p) => monthKey(p.date) === lastMonth && dayOf(p.date) <= lastDay),
  )
  return {
    current,
    previous,
    packsDiff: current.packs - previous.packs,
    amountDiff: current.amount - previous.amount,
  }
}

export interface MonthPoint extends Summary {
  /** YYYY-MM */
  month: string
}

/** 直近 count か月（今月を含む）の月別集計。記録のない月は0。 */
export function monthlySeries(purchases: Purchase[], today: string, count = 12): MonthPoint[] {
  const end = monthKey(today)
  const start = addMonths(end, -(count - 1))
  return monthRange(start, end).map((month) => ({ month, ...monthSummary(purchases, month) }))
}

export interface CumulativePoint {
  /** YYYY-MM */
  month: string
  /** その月末までの累計金額 */
  amount: number
}

/** 最初の記録の月から今月までの、月単位の累計金額。記録がなければ空。 */
export function cumulativeSeries(purchases: Purchase[], today: string): CumulativePoint[] {
  if (purchases.length === 0) return []
  const first = purchases.reduce((min, p) => (p.date < min ? p.date : min), purchases[0].date)
  const end = monthKey(today)
  const start = monthKey(first) > end ? end : monthKey(first)
  let running = 0
  return monthRange(start, end).map((month) => {
    running += monthSummary(purchases, month).amount
    return { month, amount: running }
  })
}

export interface DayGroup extends Summary {
  date: string
  items: Purchase[]
}

/** 日付ごとにまとめ、新しい順に並べる。同じ日の中は記録した順。 */
export function groupByDay(purchases: Purchase[]): DayGroup[] {
  const map = new Map<string, Purchase[]>()
  for (const p of purchases) {
    const list = map.get(p.date)
    if (list) list.push(p)
    else map.set(p.date, [p])
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, items]) => {
      const sorted = [...items].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
      return { date, items: sorted, ...sum(sorted) }
    })
}
