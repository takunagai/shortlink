# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Cloudflare Workers 上で動く URL 短縮サービス。単一 Worker（Hono）が短縮リダイレクト・管理 API・静的アセット配信をすべて担い、管理画面は Astro + React 19 の静的ビルド成果物として同じ Worker から配信される。DB は D1（Drizzle ORM）。

初期実装は Claude Code セッション `11f94500-3da7-4373-b641-92da32367b0c` で開発した（設計判断の経緯を遡る場合の参照値）。

## コマンド

パッケージマネージャは pnpm（`packageManager: pnpm@11.11.0`）。

```bash
pnpm build            # astro build（管理画面を dist/ に出力）
pnpm dev              # wrangler dev（Worker + dist/ 配信。ポート 8787）
pnpm test             # vitest run（workers + dom の 2 プロジェクト）
pnpm test:watch       # vitest watch
pnpm typecheck        # tsc --noEmit
pnpm check            # biome check .
pnpm check:write      # biome check . --write（自動修正）
pnpm db:generate      # drizzle-kit generate（スキーマ変更 → マイグレーション SQL 生成）
pnpm db:migrate       # wrangler d1 migrations apply shortlink-db（--local / --remote を付けて使う）
pnpm db:studio        # drizzle-kit studio
pnpm deploy           # wrangler deploy
```

- **`/admin` を動かすには先に `pnpm build` が必要**。`wrangler dev` は Astro の dev サーバーではなく、`assets.directory: ./dist`（wrangler.jsonc）のビルド済み成果物を配信する。管理画面の変更は build し直すまで反映されない
- 単一テストファイル: `pnpm vitest run test/links.test.ts`
- テスト名で絞り込み: `pnpm vitest run -t "mutated signature"`
- ローカル DB 初期化: `pnpm db:migrate --local`（テストは `test/apply-migrations.ts` が自動適用するので不要）

## アーキテクチャ

### 単一 Worker + ルーティング優先順位（src/index.ts）

エントリポイントは `src/index.ts` の Hono アプリ 1 本。リクエストは次の優先順位で処理される:

1. 全体 middleware: `/api/*` は素通し。それ以外はまず `c.env.ASSETS.fetch()` で静的アセット（Astro ビルド成果物）を試し、404 ならフォールバックして下位ルートへ
2. `/api/auth/login`・`/api/links`（GET/POST）・`/api/links/:slug`（DELETE）の API 群
3. `GET /:slug` — 静的アセットに該当がなかった場合のみ到達。`clicks` を +1 して 302 リダイレクト

予約パスは `src/index.ts` 冒頭の配列（`api`, `admin`）で一元管理され、slug の生成・バリデーション両方が参照する。予約パスを増やす場合はここだけ変更する。

### 認証（セッション Cookie）

- `POST /api/auth/login` に `ADMIN_API_KEY` を送るとセッション Cookie（`HttpOnly; Secure; SameSite=Strict; Max-Age=86400`）が発行される。管理 API はすべて `adminAuth` middleware で保護
- Cookie は `payload.signature` 形式。payload は発行時刻（Unix ms）のみで、HMAC-SHA256（Web Crypto）で署名
- **秘密の分離が設計上の要点**: `ADMIN_API_KEY` はログイン時の比較専用、Cookie 署名鍵は別の `SESSION_SECRET`。両者を混同する変更は過去レビューで blocking 判定された（docs/code-review-round3.md B-002）
- `verifySession` は署名検証のみを担い、期限切れは `adminAuth` 側で発行時刻 + `SESSION_MAX_AGE` をサーバー側検証する
- 署名比較は定数時間比較（XOR 蓄積、ループ上限を信頼側の長さに固定、長さ不一致は diff=1 開始）。短絡 return を入れる変更はタイミング攻撃耐性を壊すので不可（docs/code-review-round3.md N-001）

認証方式の変遷（Bearer トークン → クライアント露出の指摘 → セッション Cookie 化 → 秘密分離）は docs/code-review-round2.md / code-review-round3.md に記録がある。認証周りを触る前に必読。

### DB（D1 + Drizzle）

- スキーマは `src/db/schema.ts` の `links` テーブル 1 本（slug に unique index、`clicks`、`created_at`）
- `created_at` は text 列（ISO8601）。**辞書順 = 時系列順である前提**で一覧のソートに使っている。フォーマットを変えるとソートが壊れる
- マイグレーションは `drizzle/` 配下。スキーマ変更フロー: `src/db/schema.ts` 編集 → `pnpm db:generate` → `pnpm db:migrate --local`（本番は `--remote`）

### slug 生成

base62 の 7 文字を `crypto.getRandomValues` で生成。ランダム生成時は衝突で最大 5 回リトライして失敗なら 503、ユーザー指定 slug は事前重複チェックで 409。

### フロントエンド（Astro static + React island）

- Astro は static output（SSR なし）。React island は `AdminPage`（`client:load`）1 つで、データ取得はすべてクライアントサイド fetch
- スタイリングは Tailwind v4 の CSS-first（`@theme`）。デザイントークンの定義方針は docs/design-tokens.md、管理画面の情報設計は docs/admin-design.md

## テスト構成

`vitest.config.ts` で 2 プロジェクト構成:

| プロジェクト | 対象 | 環境 |
|---|---|---|
| `workers` | `test/**/*.test.ts` | `@cloudflare/vitest-pool-workers`（実 Workers ランタイム + D1。`test/apply-migrations.ts` がマイグレーション適用） |
| `dom` | `test/**/*.dom.test.tsx` | happy-dom + Testing Library |

認証の異常系（署名改ざん・切り詰め/パディング・空署名・非数値 payload・期限切れ・`SESSION_SECRET` 未設定など）が重点的にカバーされている。認証コードを変更したら `test/links.test.ts` の該当 describe を必ず通すこと。

## 環境変数

ローカルは `.dev.vars`（gitignore 済み、雛形は `.dev.vars.example`）:

- `ADMIN_API_KEY` — ログイン用の管理キー
- `SESSION_SECRET` — セッション Cookie の HMAC 署名鍵（ADMIN_API_KEY と必ず別の値にする）

本番は `wrangler secret put` で登録する。

## 既知の未整備事項

- `wrangler.jsonc` の `database_id` はプレースホルダのまま（本番 D1 未作成）。初回デプロイ手順は README.md 参照
- CI（.github/workflows）は未整備
- `design/admin-mock/` は独立した package.json を持つ管理画面のデザインモック。本体のビルド・テストには関与しない
