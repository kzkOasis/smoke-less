import { useState } from 'react'
import { shareLink, startSharing, stopSharing, syncNow } from '../lib/share'
import type { ShareConfig } from '../lib/store'
import { Card, ConfirmDialog } from './ui'

const formatTime = (iso: string) => {
  const d = new Date(iso)
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${mm}`
}

/** 設定画面の「家族と共有」。始めるのも、やめるのも本人が操作する。 */
export function ShareCard({ share }: { share: ShareConfig | null }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<'start' | 'stop' | null>(null)

  const run = async (action: () => Promise<string | null>) => {
    setBusy(true)
    setMessage(null)
    try {
      setMessage(await action())
    } catch {
      setMessage('通信できませんでした。電波の良いところでもう一度お試しください。')
    }
    setBusy(false)
  }

  const start = () =>
    run(async () => {
      await startSharing()
      return '共有を始めました。リンクを家族に送ってください。'
    })

  const stop = () =>
    run(async () => {
      await stopSharing()
      return '共有をやめました。これまでのリンクは使えなくなりました。'
    })

  const send = (link: string) =>
    run(async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: 'へらすログ', text: '煙草の記録を共有します', url: link })
          return null
        } catch (e) {
          // 共有シートを閉じただけの場合は何も出さない
          if (e instanceof DOMException && e.name === 'AbortError') return null
        }
      }
      await navigator.clipboard.writeText(link)
      return 'リンクをコピーしました。'
    })

  const resend = () =>
    run(async () =>
      (await syncNow()) === 'synced'
        ? '最新の記録を送りました。'
        : '送れませんでした。オンラインになると自動で送られます。',
    )

  const link = share ? shareLink(share.id) : null

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">家族と共有</h2>
        <p
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            share ? 'bg-accent-soft text-accent' : 'bg-paper text-sub'
          }`}
        >
          {share ? '共有中' : 'オフ'}
        </p>
      </div>

      {share && link ? (
        <>
          <p className="text-sub mt-2 text-xs leading-relaxed">
            リンクを知っている人は、日ごとの記録・金額・グラフ・月の目標を見られます。見るだけで、書き換えはできません。
          </p>
          <p className="border-line bg-paper mt-3 rounded-xl border px-3 py-2 text-xs break-all select-all">
            {link}
          </p>
          <p className="text-sub mt-2 text-xs">
            {share.lastSyncedAt ? `最後に送った日時：${formatTime(share.lastSyncedAt)}` : 'まだ送れていません'}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void send(link)}
              className="bg-accent rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              リンクを送る
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void resend()}
              className="border-line rounded-xl border py-3 text-sm font-medium disabled:opacity-50"
            >
              今すぐ送り直す
            </button>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirm('stop')}
            className="text-sub mt-3 w-full rounded-xl py-2.5 text-sm underline underline-offset-2 disabled:opacity-50"
          >
            共有をやめる
          </button>
        </>
      ) : (
        <>
          <p className="text-sub mt-2 text-xs leading-relaxed">
            オンにすると、家族が専用のリンクからあなたの記録を見られるようになります。いつでもやめられます。
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirm('start')}
            className="border-line mt-3 w-full rounded-xl border py-3 text-sm font-medium disabled:opacity-50"
          >
            {busy ? '準備中…' : '共有を始める'}
          </button>
        </>
      )}

      <p className="text-sub mt-3 min-h-4 text-xs" aria-live="polite">
        {message}
      </p>

      {confirm === 'start' && (
        <ConfirmDialog
          title="家族と共有しますか"
          message="記録がサーバーに保存され、リンクを知っている人が日ごとの記録・金額・月の目標を見られるようになります。共有中はホームに「家族と共有中」と表示されます。"
          confirmLabel="共有する"
          onConfirm={() => {
            setConfirm(null)
            void start()
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'stop' && (
        <ConfirmDialog
          title="共有をやめますか"
          message="サーバー上の記録を消し、いまのリンクを使えなくします。このスマホの中の記録はそのまま残ります。"
          confirmLabel="やめる"
          onConfirm={() => {
            setConfirm(null)
            void stop()
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </Card>
  )
}
