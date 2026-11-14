import { describe, expect, it } from 'vitest'
import { addMonths, daysInMonth, monthRange, toDateString } from './date'

describe('日付ユーティリティ', () => {
  it('ローカル日付を YYYY-MM-DD にする', () => {
    expect(toDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
  it('月の加減算が年をまたぐ', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-11', -11)).toBe('2025-12')
  })
  it('月の日数（うるう年を含む）', () => {
    expect(daysInMonth('2026-02')).toBe(28)
    expect(daysInMonth('2028-02')).toBe(29)
    expect(daysInMonth('2026-11')).toBe(30)
  })
  it('月の範囲', () => {
    expect(monthRange('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })
})
