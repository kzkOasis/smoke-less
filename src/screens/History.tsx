import { useState } from 'react'
import { ScreenTitle } from '../components/ui'
import { groupByDay } from '../lib/aggregate'
import { formatFullDay, todayString } from '../lib/date'
import { formatYen } from '../lib/format'
import { addPurchase, deletePurchase } from '../lib/store'
import type { Purchase } from '../lib/types'

export function History({ purchases }: { purchases: Purchase[] }) {
  const today = todayString()
  const groups = groupByDay(purchases)
  const [open, setOpen] = useState<string | null>(null)
  const [date, setDate] = useState(today)
  const [added, setAdded] = useState<string | null>(null)

  const canAdd = date !== '' && date <= today

  const add = async () => {
    if (!canAdd) return
    await addPurchase(date)
    setAdded(date)
    setOpen(date)
  }

  return (
    <div>
      <ScreenTitle>履歴</ScreenTitle>

      <section className="bg-card border-line mb-5 rounded-2xl border p-4">
        <label htmlFor="add-date" className="text-sub text-xs font-medium">
          日付を指定して追加
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="add-date"
            type="date"
            value={date}
            max={today}
            onChange={(e) => {
              setDate(e.target.value)
              setAdded(null)
            }}
            className="border-line bg-paper min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-base"
          />
          <button
            type="button"
            onClick={add}
            disabled={!canAdd}
            className="bg-accent rounded-xl px-4 text-sm font-semibold whitespace-nowrap text-white disabled:opacity-40"
          >
            ＋1箱
          </button>
        </div>
        <p className="text-sub mt-2 text-xs" aria-live="polite">
          {date > today
            ? '未来の日付は選べません。'
            : added
              ? `${formatFullDay(added)}に1箱追加しました。`
              : '価格は現在の設定値で記録します。'}
        </p>
      </section>

      {groups.length === 0 ? (
        <p className="text-sub py-10 text-center text-sm">まだ記録がありません</p>
      ) : (
        <ul className="bg-card border-line divide-line divide-y overflow-hidden rounded-2xl border">
          {groups.map((g) => {
            const isOpen = open === g.date
            return (
              <li key={g.date}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : g.date)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                >
                  <span className="text-sm font-medium">{formatFullDay(g.date)}</span>
                  <span className="tabular text-sub flex items-center gap-3 text-sm">
                    <span>{g.packs}箱</span>
                    <span className="text-ink w-20 text-right font-medium">
                      {formatYen(g.amount)}
                    </span>
                    <span className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                  </span>
                </button>
                {isOpen && (
                  <ul className="bg-paper divide-line border-line divide-y border-t">
                    {g.items.map((p, i) => (
                      <li key={p.id} className="flex items-center justify-between py-2 pr-3 pl-6">
                        <span className="tabular text-sm">
                          {i + 1}箱目
                          <span className="text-sub ml-3">{formatYen(p.price)}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => deletePurchase(p.id)}
                          className="text-sub rounded-lg px-3 py-2 text-sm underline underline-offset-2"
                        >
                          削除
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
