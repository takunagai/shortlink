# shortlink 管理画面 ─ デザインカンプ（静的モック）

このディレクトリは web-designer が作成した `/admin` のデザインカンプ。Astro v7 + Tailwind v4（CSS-first）でビルド可能。実装（React 19 island 化）は coder の別タスク（`t_e670aec9`）で行う。

## 成果物の対応

| ファイル | 役割 |
|---|---|
| `docs/admin-design.md` | 情報設計・コンポーネントツリー・状態遷移・データフロー |
| `docs/design-tokens.md` | デザイントークン（Tailwind v4 `@theme` 記法） |
| `design/admin-mock/` | 本カンプ。ビルドして HTML を確認できる |

## カンプのページ

- `/` ─ デフォルト状態（データあり・フォーム idle）。本番の `/admin` 相当。
- `/state-gallery` ─ 各状態（loading / empty / error / success / confirm）とトークン早見表。

## 実行

```bash
cd design/admin-mock
pnpm install
pnpm build      # dist/ に HTML を生成
pnpm dev        # ローカルで確認（http://localhost:4321/）
```

## 実装（coder）への引き継ぎメモ

- `src/styles/global.css` の `@theme` ブロックは `docs/design-tokens.md` と同一内容。そのまま実装側の `src/styles/global.css` に移植してよい。
- コンポーネント（`PageHeader.astro` / `LinkCreateForm.astro` / `LinkList.astro`）は静的マークアップ。これを React 19 の `PageHeader.tsx` / `LinkCreateForm.tsx` / `LinkList.tsx` / `DeleteButton.tsx` に変換し、`AdminPage.tsx` で状態を持たせる。
- クラス名はそのまま Tailwind ユーティリティ（意味トークン経由）で動作する。React 側でも `cn()`（clsx + tailwind-merge）でバリアント制御する。
- モバイル（< 768px）はテーブルをカードリストに切り替えている（`hidden md:block` / `md:hidden`）。この挙動を維持すること。
- コピーは全箇所 `【コピー待ち: ...】` で明示。確定次第、実テキストに差し替える。
