# へらすログ

買った煙草の箱数をボタン一つで記録し、使った金額を見える化する減煙サポートアプリです。
仕様は [SPEC.md](./SPEC.md) にあります。

- ホーム画面に追加できるPWA（オフラインでも動作）
- データは端末内（IndexedDB）に保存します。家族との共有をオンにした間だけ、サーバーにも送ります
- 設定画面からバックアップの書き出しと読み込みができます

## 開発

```bash
npm install
npm run dev      # 開発サーバー
npm test         # 集計・保存・バックアップのテスト
npm run build    # 本番ビルド（dist/）
npm run preview  # ビルド結果の確認
```

## 構成

| 場所 | 内容 |
| --- | --- |
| `src/lib/aggregate.ts` | 集計ロジック（純粋関数） |
| `src/lib/store.ts` | データの読み書き。保存先を変える時はここだけ差し替える |
| `src/lib/backup.ts` | バックアップの形式と検証 |
| `src/lib/share.ts` | 家族との共有（サーバーへの同期、共有リンク） |
| `api/share.ts` | 共有用のAPI（Vercel Functions + Vercel Blob） |
| `src/screens/` | ホーム、履歴、グラフ、設定の4画面 |

## 公開

Vercelにこのリポジトリを取り込めばデプロイできます（Viteを自動認識）。
家族との共有には、プロジェクトにVercel Blobの非公開ストアをつなぐ必要があります（`BLOB_READ_WRITE_TOKEN`）。
