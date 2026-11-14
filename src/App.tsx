import { lazy, Suspense, useState } from 'react'
import { TabBar, type TabId } from './components/TabBar'
import { useData } from './lib/useData'
import { History } from './screens/History'
import { Home } from './screens/Home'
import { SettingsScreen } from './screens/Settings'

// グラフのライブラリは大きいので、グラフ画面を開いた時に読み込む
const Charts = lazy(() => import('./screens/Charts').then((m) => ({ default: m.Charts })))

export default function App() {
  // 起動時は必ずホームを開く
  const [tab, setTab] = useState<TabId>('home')
  const data = useData()

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <main className="flex-1 overflow-y-auto px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6">
        {data && (
          <>
            {tab === 'home' && <Home purchases={data.purchases} settings={data.settings} />}
            {tab === 'history' && <History purchases={data.purchases} />}
            {tab === 'charts' && (
              <Suspense fallback={null}>
                <Charts purchases={data.purchases} />
              </Suspense>
            )}
            {tab === 'settings' && (
              <SettingsScreen purchases={data.purchases} settings={data.settings} />
            )}
          </>
        )}
      </main>
      <TabBar current={tab} onChange={setTab} />
    </div>
  )
}
