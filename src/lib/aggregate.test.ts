import { describe, expect, it } from 'vitest'
import {
  compareWithPreviousMonth,
  cumulativeSeries,
  daySummary,
  groupByDay,
  monthSummary,
  monthlySeries,
  remainingToGoal,
  totalSummary,
} from './aggregate'
import type { Purchase } from './types'

let seq = 0
const p = (date: string, price = 600): Purchase => ({
  id: `id-${++seq}`,
  date,
  price,
  createdAt: `${date}T00:00:${String(seq % 60).padStart(2, '0')}.000Z`,
})

describe('日・月・累計の集計', () => {
  const data = [p('2026-10-31'), p('2026-11-01'), p('2026-11-15'), p('2026-11-15', 620)]

  it('今日の箱数と金額', () => {
    expect(daySummary(data, '2026-11-15')).toEqual({ packs: 2, amount: 1220 })
    expect(daySummary(data, '2026-11-14')).toEqual({ packs: 0, amount: 0 })
  })

  it('今月の箱数と金額', () => {
    expect(monthSummary(data, '2026-11')).toEqual({ packs: 3, amount: 1820 })
  })

  it('累計は全記録の price の合計', () => {
    expect(totalSummary(data)).toEqual({ packs: 4, amount: 2420 })
  })

  it('価格を変えても過去の記録の金額は変わらない', () => {
    const before = [p('2026-11-01', 600), p('2026-11-02', 600)]
    const after = [...before, p('2026-11-03', 650)]
    expect(monthSummary(after, '2026-11').amount).toBe(600 + 600 + 650)
  })
})

describe('目標までの残り', () => {
  it('目標がなければ null', () => {
    expect(remainingToGoal(null, 5)).toBeNull()
  })
  it('残り箱数を返す', () => {
    expect(remainingToGoal(20, 5)).toBe(15)
    expect(remainingToGoal(20, 20)).toBe(0)
  })
  it('目標を超えたら null（残り表示をやめる）', () => {
    expect(remainingToGoal(20, 21)).toBeNull()
  })
})

describe('前月比', () => {
  it('先月の同じ日までと比べる', () => {
    const data = [
      p('2026-10-01'),
      p('2026-10-10'),
      p('2026-10-15'),
      p('2026-10-16'), // 16日は比較対象外
      p('2026-11-03'),
      p('2026-11-15'),
    ]
    const r = compareWithPreviousMonth(data, '2026-11-15')
    expect(r).not.toBeNull()
    expect(r!.previous).toEqual({ packs: 3, amount: 1800 })
    expect(r!.current).toEqual({ packs: 2, amount: 1200 })
    expect(r!.packsDiff).toBe(-1)
    expect(r!.amountDiff).toBe(-600)
  })

  it('先月に同じ日がなければ先月末までを比べる', () => {
    const data = [p('2026-02-27'), p('2026-02-28'), p('2026-03-31')]
    const r = compareWithPreviousMonth(data, '2026-03-31')
    expect(r!.previous.packs).toBe(2)
    expect(r!.current.packs).toBe(1)
  })

  it('年をまたぐ', () => {
    const data = [p('2025-12-05'), p('2026-01-05')]
    const r = compareWithPreviousMonth(data, '2026-01-10')
    expect(r!.previous.packs).toBe(1)
    expect(r!.packsDiff).toBe(0)
  })

  it('先月の記録が1件もなければ null', () => {
    expect(compareWithPreviousMonth([p('2026-11-03')], '2026-11-15')).toBeNull()
    expect(compareWithPreviousMonth([], '2026-11-15')).toBeNull()
  })

  it('先月に記録はあるが同じ日までには無い場合は 0 と比べる', () => {
    const r = compareWithPreviousMonth([p('2026-10-30'), p('2026-11-02')], '2026-11-15')
    expect(r!.previous.packs).toBe(0)
    expect(r!.packsDiff).toBe(1)
  })
})

describe('月別の推移', () => {
  it('直近12か月を返し、記録のない月は0', () => {
    const s = monthlySeries([p('2026-09-10'), p('2026-11-01'), p('2026-11-02')], '2026-11-15')
    expect(s).toHaveLength(12)
    expect(s[0].month).toBe('2025-12')
    expect(s[11]).toEqual({ month: '2026-11', packs: 2, amount: 1200 })
    expect(s[10]).toEqual({ month: '2026-10', packs: 0, amount: 0 })
    expect(s[9].packs).toBe(1)
  })
})

describe('累計の推移', () => {
  it('最初の記録の月から今月までを積み上げる', () => {
    const s = cumulativeSeries([p('2026-09-10'), p('2026-11-01'), p('2026-11-02')], '2026-11-15')
    expect(s).toEqual([
      { month: '2026-09', amount: 600 },
      { month: '2026-10', amount: 600 },
      { month: '2026-11', amount: 1800 },
    ])
  })
  it('記録がなければ空', () => {
    expect(cumulativeSeries([], '2026-11-15')).toEqual([])
  })
})

describe('履歴のグループ化', () => {
  it('日付の新しい順にまとめる', () => {
    const g = groupByDay([p('2026-11-01'), p('2026-11-15'), p('2026-11-15')])
    expect(g.map((d) => d.date)).toEqual(['2026-11-15', '2026-11-01'])
    expect(g[0]).toMatchObject({ packs: 2, amount: 1200 })
  })
})
