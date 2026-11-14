import type { ReactNode } from 'react'

export type TabId = 'home' | 'history' | 'charts' | 'settings'

const icon = (children: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
)

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  {
    id: 'home',
    label: 'ホーム',
    icon: icon(
      <>
        <path d="M4 11l8-7 8 7" />
        <path d="M6 10v9h12v-9" />
      </>,
    ),
  },
  {
    id: 'history',
    label: '履歴',
    icon: icon(
      <>
        <path d="M8 6h12M8 12h12M8 18h12" />
        <path d="M4 6h.01M4 12h.01M4 18h.01" />
      </>,
    ),
  },
  {
    id: 'charts',
    label: 'グラフ',
    icon: icon(
      <>
        <path d="M5 20V11M12 20V5M19 20v-6" />
      </>,
    ),
  },
  {
    id: 'settings',
    label: '設定',
    icon: icon(
      <>
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="8" cy="17" r="2" />
      </>,
    ),
  },
]

export function TabBar({ current, onChange }: { current: TabId; onChange: (t: TabId) => void }) {
  return (
    <nav
      aria-label="画面の切り替え"
      className="border-line bg-card grid grid-cols-4 border-t pb-[env(safe-area-inset-bottom)]"
    >
      {TABS.map((t) => {
        const active = t.id === current
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${
              active ? 'text-accent font-semibold' : 'text-sub'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        )
      })}
    </nav>
  )
}
