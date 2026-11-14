import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { SummaryCards } from '../components/SummaryCards'
import { TabBar, type TabId } from '../components/TabBar'
import { daySummary } from '../lib/aggregate'
import { todayString } from '../lib/date'
import { fetchShared, type FetchResult } from '../lib/share'
import { History } from './History'

const Charts = lazy(() => import('./Charts').then((m) => ({ default: m.Charts })))

const formatUpdatedAt = (iso: string) => {
  const d = new Date(iso)
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${mm}`
}

/** 家族用の閲覧画面。共有リンクから開く。見るだけで、記録の追加や削除はできない。 */
export function Viewer({ shareId }: { shareId: string }) {
  const [result, setResult] = useState<FetchResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabId>('home')

  // 読み込みの世代。古い応答が後から届いても、新しい結果を上書きしないようにする
  const generation = useRef(0)

  const load = useCallback(() => {
    const mine = ++generation.current
    void fetchShared(shareId).then((next) => {
      if (mine !== generation.current) return
      setResult(next)
      setLoading(false)
    })
  }, [shareId])

  const refresh = useCallback(() => {
    setLoading(true)
    load()
  }, [load])

  useEffect(() => {
    load()
    // 画面に戻ってきた時に最新を取り直す
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load, refresh])

  if (!result) {
    return <Message title="読み込んでいます…" />
  }
  if (result.status === 'not-found') {
    return (
      <Message
        title="この共有リンクは使えません"
        body="共有が終了したか、リンクが正しくない可能性があります。"
      />
    )
  }
  if (result.status === 'error') {
    return (
      <Message
        title="読み込めませんでした"
        body="通信状況を確認して、もう一度お試しください。"
        onRetry={refresh}
      />
    )
  }

  const { data } = result
  const today = todayString()
  const day = daySummary(data.purchases, today)

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <header className="border-line bg-card flex items-center justify-between gap-3 border-b px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div>
          <p className="text-sm font-bold">共有された記録</p>
          <p className="text-sub text-xs">
            見るだけの画面です・最終更新 {formatUpdatedAt(data.updatedAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="border-line rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap disabled:opacity-50"
        >
          {loading ? '更新中…' : '更新'}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pt-5 pb-6">
        {tab === 'home' && (
          <div className="grid gap-3">
            <section className="bg-card border-line rounded-2xl border p-4">
              <h2 className="text-sub text-xs font-medium">今日</h2>
              <p className="tabular mt-1 text-2xl font-bold">{day.packs}箱</p>
            </section>
            <SummaryCards purchases={data.purchases} settings={data.settings} today={today} />
          </div>
        )}
        {tab === 'history' && <History purchases={data.purchases} readOnly />}
        {tab === 'charts' && (
          <Suspense fallback={null}>
            <Charts purchases={data.purchases} />
          </Suspense>
        )}
      </main>

      <TabBar
        current={tab}
        onChange={setTab}
        only={['home', 'history', 'charts']}
        labels={{ home: 'まとめ' }}
      />
    </div>
  )
}

function Message({ title, body, onRetry }: { title: string; body?: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center px-8 text-center">
      <h1 className="text-base font-bold">{title}</h1>
      {body && <p className="text-sub mt-2 text-sm leading-relaxed">{body}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="bg-accent mt-5 rounded-xl px-5 py-3 text-sm font-semibold text-white"
        >
          もう一度読み込む
        </button>
      )}
    </div>
  )
}
