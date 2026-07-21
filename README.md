# shortlink

Cloudflare Workers で動く URL 短縮サービス。単一の Worker が短縮 URL のリダイレクト・管理 API・管理画面の配信をすべて担う。

## 機能

- 短縮 URL リダイレクト（302、クリック数を記録）
- slug 自動生成（base62・7 文字・衝突リトライ付き）とカスタム slug 指定
- 管理画面 `/admin`（リンクの作成・一覧・削除）
- セッション Cookie ベースの管理者認証（HMAC-SHA256 署名、HttpOnly / Secure / SameSite=Strict）

## 技術スタック

| レイヤー | 技術 |
|---|---|
| ランタイム | Cloudflare Workers |
| API | Hono + @hono/zod-validator |
| DB | Cloudflare D1 + Drizzle ORM |
| 管理画面 | Astro 7（static）+ React 19 + Tailwind CSS v4 |
| テスト | Vitest（@cloudflare/vitest-pool-workers + happy-dom） |
| Lint / Format | Biome |

## セットアップ

前提: Node.js、pnpm、Cloudflare アカウント（デプロイ時のみ）。

```bash
pnpm install

# 環境変数（雛形をコピーして値を設定）
cp .dev.vars.example .dev.vars
# ADMIN_API_KEY と SESSION_SECRET を必ず別々の値に設定する

# ローカル D1 にマイグレーション適用
pnpm db:migrate --local

# 管理画面をビルドしてから dev サーバー起動
pnpm build
pnpm dev
```

http://localhost:8787/admin で管理画面が開く。`ADMIN_API_KEY` に設定した値でログインする。

> **Note**: `pnpm dev`（wrangler dev）はビルド済みの `dist/` を配信するため、管理画面の変更は `pnpm build` を再実行するまで反映されない。

## コマンド

| コマンド | 内容 |
|---|---|
| `pnpm dev` | ローカル開発サーバー（wrangler dev） |
| `pnpm build` | 管理画面のビルド（astro build） |
| `pnpm test` | 全テスト実行 |
| `pnpm test:watch` | テストの watch 実行 |
| `pnpm typecheck` | 型チェック |
| `pnpm check` / `pnpm check:write` | Biome による lint / format（`:write` で自動修正） |
| `pnpm db:generate` | スキーマからマイグレーション SQL 生成 |
| `pnpm db:migrate` | マイグレーション適用（`--local` / `--remote`） |
| `pnpm deploy` | Cloudflare へデプロイ |

## API

| メソッド | パス | 認証 | 内容 |
|---|---|---|---|
| POST | `/api/auth/login` | 不要 | `ADMIN_API_KEY` を検証しセッション Cookie を発行 |
| GET | `/api/links` | 要 | リンク一覧（作成日時降順） |
| POST | `/api/links` | 要 | リンク作成（slug 省略時は自動生成） |
| DELETE | `/api/links/:slug` | 要 | リンク削除 |
| GET | `/:slug` | 不要 | 302 リダイレクト（クリック数 +1） |

## デプロイ（初回）

本番 D1 は未作成で、`wrangler.jsonc` の `database_id` はプレースホルダのまま。初回デプロイは次の手順で行う。

```bash
# 1. 本番 D1 データベースを作成
wrangler d1 create shortlink-db
# 出力された database_id を wrangler.jsonc の d1_databases[0].database_id に転記

# 2. 本番 D1 にマイグレーション適用
pnpm db:migrate --remote

# 3. シークレットを登録（それぞれ別の強い値を設定）
wrangler secret put ADMIN_API_KEY
wrangler secret put SESSION_SECRET

# 4. ビルドしてデプロイ
pnpm build
pnpm deploy
```

## プロジェクト構成

```
src/
  index.ts          # Worker エントリポイント（Hono アプリ・認証・全ルート）
  db/schema.ts      # Drizzle スキーマ（links テーブル）
  components/       # 管理画面の React コンポーネント
  pages/            # Astro ページ
drizzle/            # D1 マイグレーション SQL
test/               # Vitest（workers: API・認証 / dom: コンポーネント）
docs/               # 設計書・コードレビュー記録・デザイントークン定義
design/admin-mock/  # 管理画面のデザインモック（独立プロジェクト）
```

## 開発経緯

VPS Hermes Engineer Team の検証プロジェクトとして開始し、Claude Code によるレビュー往復（docs/code-review-round2.md / round3.md）を経て認証設計を強化した。
