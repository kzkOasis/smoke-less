const yen = new Intl.NumberFormat('ja-JP')

/** 12600 → "12,600円" */
export function formatYen(amount: number): string {
  return `${yen.format(amount)}円`
}
