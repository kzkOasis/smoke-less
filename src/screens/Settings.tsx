import { useRef, useState } from 'react'
import { Card, ConfirmDialog, ScreenTitle } from '../components/ui'
import { type Backup, createBackup, parseBackup } from '../lib/backup'
import { todayString } from '../lib/date'
import { replaceAll, saveSettings } from '../lib/store'
import type { Purchase, Settings } from '../lib/types'

const PRICE_MIN = 1
const PRICE_MAX = 9999

const parseIntStrict = (text: string): number | null =>
  /^\d+$/.test(text.trim()) ? Number(text.trim()) : null

export function SettingsScreen({
  purchases,
  settings,
}: {
  purchases: Purchase[]
  settings: Settings
}) {
  const [price, setPrice] = useState(String(settings.pricePerPack))
  const [goal, setGoal] = useState(
    settings.monthlyGoalPacks === null ? '' : String(settings.monthlyGoalPacks),
  )
  const [pending, setPending] = useState<Backup | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const priceValue = parseIntStrict(price)
  const priceOk = priceValue !== null && priceValue >= PRICE_MIN && priceValue <= PRICE_MAX
  const goalValue = goal.trim() === '' ? null : parseIntStrict(goal)
  const goalOk = goal.trim() === '' || (goalValue !== null && goalValue >= 1 && goalValue <= 999)

  const commitPrice = (text: string) => {
    setPrice(text)
    const v = parseIntStrict(text)
    if (v !== null && v >= PRICE_MIN && v <= PRICE_MAX) {
      void saveSettings({ ...settings, pricePerPack: v })
    }
  }

  const commitGoal = (text: string) => {
    setGoal(text)
    if (text.trim() === '') {
      void saveSettings({ ...settings, monthlyGoalPacks: null })
      return
    }
    const v = parseIntStrict(text)
    if (v !== null && v >= 1 && v <= 999) {
      void saveSettings({ ...settings, monthlyGoalPacks: v })
    }
  }

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(createBackup(settings, purchases), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `herasu-log-backup-${todayString()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage(`${purchases.length}件の記録を書き出しました。`)
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setPending(parseBackup(await file.text()))
      setMessage(null)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '読み込めませんでした。')
    }
    if (fileInput.current) fileInput.current.value = ''
  }

  const restore = async () => {
    if (!pending) return
    await replaceAll(pending.settings, pending.purchases)
    setPrice(String(pending.settings.pricePerPack))
    setGoal(
      pending.settings.monthlyGoalPacks === null ? '' : String(pending.settings.monthlyGoalPacks),
    )
    setMessage(`${pending.purchases.length}件の記録を読み込みました。`)
    setPending(null)
  }

  const inputClass =
    'border-line bg-paper tabular w-28 rounded-xl border px-3 py-2.5 text-right text-base'

  return (
    <div className="grid gap-4">
      <ScreenTitle>設定</ScreenTitle>

      <Card className="-mt-4">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="price" className="text-sm font-medium">
            1箱の価格
          </label>
          <div className="flex items-center gap-2">
            <input
              id="price"
              inputMode="numeric"
              value={price}
              onChange={(e) => commitPrice(e.target.value)}
              aria-invalid={!priceOk}
              aria-describedby="price-help"
              className={inputClass}
            />
            <span className="text-sub text-sm">円</span>
          </div>
        </div>
        <p id="price-help" className="text-sub mt-2 text-xs leading-relaxed">
          {priceOk
            ? '次の記録から使われます。これまでの記録の金額は変わりません。'
            : `${PRICE_MIN}〜${PRICE_MAX.toLocaleString('ja-JP')}の整数を入れてください。`}
        </p>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="goal" className="text-sm font-medium">
            月の目標箱数
          </label>
          <div className="flex items-center gap-2">
            <input
              id="goal"
              inputMode="numeric"
              value={goal}
              placeholder="なし"
              onChange={(e) => commitGoal(e.target.value)}
              aria-invalid={!goalOk}
              aria-describedby="goal-help"
              className={inputClass}
            />
            <span className="text-sub text-sm">箱</span>
          </div>
        </div>
        <p id="goal-help" className="text-sub mt-2 text-xs leading-relaxed">
          {goalOk
            ? '空欄にすると目標なしになります。'
            : '1〜999の整数を入れるか、空欄にしてください。'}
        </p>
      </Card>

      <Card>
        <h2 className="text-sm font-medium">バックアップ</h2>
        <p className="text-sub mt-1 text-xs leading-relaxed">
          記録はこのスマホの中だけに保存されています。機種変更の前や、ときどき書き出しておくと安心です。
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={exportBackup}
            className="bg-accent rounded-xl py-3 text-sm font-semibold text-white"
          >
            書き出す
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="border-line rounded-xl border py-3 text-sm font-medium"
          >
            読み込む
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <p className="text-sub mt-3 min-h-4 text-xs" aria-live="polite">
          {message}
        </p>
      </Card>

      {pending && (
        <ConfirmDialog
          title="バックアップを読み込みますか"
          message={`いまの記録${purchases.length}件と設定を消して、バックアップの${pending.purchases.length}件に置き換えます。元には戻せません。`}
          confirmLabel="置き換える"
          onConfirm={() => void restore()}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}
