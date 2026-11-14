import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardLabel, ScreenTitle } from '../components/ui'
import { cumulativeSeries, monthlySeries } from '../lib/aggregate'
import { formatMonth, formatMonthShort, todayString } from '../lib/date'
import { formatYen } from '../lib/format'
import type { Purchase } from '../lib/types'

const ACCENT = '#2f6f5e'
const ACCENT_MUTED = '#a9c9bf'
const GRID = '#e3e1da'
const TICK = { fontSize: 11, fill: '#66716d' }

const compactYen = (v: number) =>
  v >= 10000 ? `${Number((v / 10000).toFixed(2))}万` : v.toLocaleString('ja-JP')

export function Charts({ purchases }: { purchases: Purchase[] }) {
  const today = todayString()
  const monthly = monthlySeries(purchases, today)
  const cumulative = cumulativeSeries(purchases, today)
  // 押した棒の月。初期値は今月。
  const [selected, setSelected] = useState(monthly.length - 1)

  if (purchases.length === 0) {
    return (
      <div>
        <ScreenTitle>グラフ</ScreenTitle>
        <p className="text-sub py-10 text-center text-sm">まだ記録がありません</p>
      </div>
    )
  }

  const picked = monthly[Math.min(selected, monthly.length - 1)]
  const last = cumulative[cumulative.length - 1]

  return (
    <div className="grid gap-4">
      <ScreenTitle>グラフ</ScreenTitle>

      <Card className="-mt-4">
        <CardLabel>月別の金額（直近12か月）</CardLabel>
        <p className="mt-1 text-sm" aria-live="polite">
          <span className="text-sub">{formatMonth(picked.month)}</span>
          <span className="tabular ml-3 text-lg font-bold">{formatYen(picked.amount)}</span>
          <span className="tabular text-sub ml-2">{picked.packs}箱</span>
        </p>
        <div className="mt-3 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonthShort}
                tick={TICK}
                tickLine={false}
                axisLine={{ stroke: GRID }}
                interval={0}
              />
              <YAxis
                tickFormatter={compactYen}
                tick={TICK}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Bar
                dataKey="amount"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
                onClick={(_, index) => setSelected(index)}
              >
                {monthly.map((m, i) => (
                  <Cell key={m.month} fill={i === selected ? ACCENT : ACCENT_MUTED} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sub mt-1 text-xs">棒を押すと、その月の金額と箱数が出ます。</p>
      </Card>

      <Card>
        <CardLabel>累計金額</CardLabel>
        <p className="tabular mt-1 text-lg font-bold">{formatYen(last.amount)}</p>
        <div className="mt-3 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumulative} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonthShort}
                tick={TICK}
                tickLine={false}
                axisLine={{ stroke: GRID }}
                minTickGap={16}
              />
              <YAxis
                tickFormatter={compactYen}
                tick={TICK}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke={ACCENT}
                strokeWidth={2.5}
                dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardLabel>月別の一覧</CardLabel>
        <table className="tabular mt-2 w-full text-sm">
          <thead>
            <tr className="text-sub border-line border-b text-xs">
              <th className="py-2 text-left font-medium">月</th>
              <th className="py-2 text-right font-medium">箱数</th>
              <th className="py-2 text-right font-medium">金額</th>
            </tr>
          </thead>
          <tbody>
            {[...monthly].reverse().map((m) => (
              <tr key={m.month} className="border-line border-b last:border-0">
                <td className="py-2">{formatMonth(m.month)}</td>
                <td className="py-2 text-right">{m.packs}箱</td>
                <td className="py-2 text-right">{formatYen(m.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
