import { lazy, Suspense, useEffect, useState } from 'react'
import { TabBar, type TabId } from './components/TabBar'
import { shareIdFromHash, startAutoSync } from './lib/share'
import { useData } from './lib/useData'
import { History } from './screens/History'
import { Home } from './screens/Home'
import { SettingsScreen } from './screens/Settings'
import { Viewer } from './screens/Viewer'

// グラフのライブラリは大きいので、グラフ画面を開いた時に読み込む
const Charts = lazy(() => import('./screens/Charts').then((m) => ({ default: m.Charts })))

/** URLの # を見て、家族用の共有リンクなら閲覧画面を出す */
function useShareId(): string | null {
  const [id, setId] = useState(() => shareIdFromHash(location.hash))
  useEffect(() => {
    const onChange = () => setId(shareIdFromHash(location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return id
}

export default function App() {
  const shareId = useShareId()
  return shareId ? <Viewer shareId={shareId} /> : <OwnerApp />
}

function OwnerApp() {
  // 起動時は必ずホームを開く
  const [tab, setTab] = useState<TabId>('home')
  const data = useData()

  // 共有がオンなら、記録の変更をサーバーに送る
  useEffect(() => startAutoSync(), [])

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <main className="flex-1 overflow-y-auto px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6">
        {data && (
          <>
            {tab === 'home' && (
              <Home
                purchases={data.purchases}
                settings={data.settings}
                sharing={data.share !== null}
              />
            )}
            {tab === 'history' && <History purchases={data.purchases} />}
            {tab === 'charts' && (
              <Suspense fallback={null}>
                <Charts purchases={data.purchases} />
              </Suspense>
            )}
            {tab === 'settings' && (
              <SettingsScreen
                purchases={data.purchases}
                settings={data.settings}
                share={data.share}
              />
            )}
          </>
        )}
      </main>
      <TabBar current={tab} onChange={setTab} />
    </div>
  )
}
