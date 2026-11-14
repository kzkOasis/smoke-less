/** 購入記録。1箱につき1件。 */
export interface Purchase {
  id: string
  /** 購入日（端末ローカル日付、YYYY-MM-DD） */
  date: string
  /** 記録した時点の1箱の価格（円） */
  price: number
  /** 記録した日時（ISO 8601） */
  createdAt: string
}

export interface Settings {
  /** 1箱の価格（円）。次の記録から使われる */
  pricePerPack: number
  /** 月の目標箱数。null なら目標表示を出さない */
  monthlyGoalPacks: number | null
}

export const DEFAULT_SETTINGS: Settings = {
  pricePerPack: 600,
  monthlyGoalPacks: null,
}
