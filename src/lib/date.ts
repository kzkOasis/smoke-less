// 日付はすべて端末ローカルの "YYYY-MM-DD" 文字列で扱う。
// Date を UTC 経由で変換すると日付がずれるため、文字列と年月日の数値だけで計算する。

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayString(): string {
  return toDateString(new Date())
}

/** "YYYY-MM-DD" → "YYYY-MM" */
export function monthKey(date: string): string {
  return date.slice(0, 7)
}

export function dayOf(date: string): number {
  return Number(date.slice(8, 10))
}

/** "YYYY-MM" に n か月を足す（n は負でもよい） */
export function addMonths(ym: string, n: number): string {
  const y = Number(ym.slice(0, 4))
  const m = Number(ym.slice(5, 7))
  const total = y * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`
}

export function daysInMonth(ym: string): number {
  const y = Number(ym.slice(0, 4))
  const m = Number(ym.slice(5, 7))
  return new Date(y, m, 0).getDate()
}

/** from から to まで（両端含む）の "YYYY-MM" を順に返す */
export function monthRange(from: string, to: string): string[] {
  const out: string[] = []
  for (let ym = from; ym <= to; ym = addMonths(ym, 1)) out.push(ym)
  return out
}

/** "2026-11-15" → "11月15日" */
export function formatDay(date: string): string {
  return `${Number(date.slice(5, 7))}月${dayOf(date)}日`
}

/** "2026-11-15" → "2026年11月15日" */
export function formatFullDay(date: string): string {
  return `${Number(date.slice(0, 4))}年${formatDay(date)}`
}

/** "2026-11" → "2026年11月" */
export function formatMonth(ym: string): string {
  return `${Number(ym.slice(0, 4))}年${Number(ym.slice(5, 7))}月`
}

/** "2026-11" → "11月" */
export function formatMonthShort(ym: string): string {
  return `${Number(ym.slice(5, 7))}月`
}
