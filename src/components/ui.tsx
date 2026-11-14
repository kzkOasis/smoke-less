import type { ReactNode } from 'react'

export function ScreenTitle({ children }: { children: ReactNode }) {
  return <h1 className="mb-4 text-xl font-bold">{children}</h1>
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`bg-card border-line rounded-2xl border p-4 ${className}`}>
      {children}
    </section>
  )
}

export function CardLabel({ children }: { children: ReactNode }) {
  return <h2 className="text-sub text-xs font-medium">{children}</h2>
}

/** 確認ダイアログ。破壊的な操作の前に使う。 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-card w-full max-w-sm rounded-2xl p-5">
        <h2 className="text-base font-bold">{title}</h2>
        <p className="text-sub mt-2 text-sm leading-relaxed">{message}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="border-line rounded-xl border py-3 text-sm font-medium"
          >
            やめる
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="bg-ink rounded-xl py-3 text-sm font-semibold text-white"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
