# shortlink B-001 修正 独立コードレビュー（Round 3）

## 判定: 未通過

- blocking: 1 件
- nit: 2 件

前回の B-001（Vite `define` による `ADMIN_API_KEY` の公開 JavaScript バンドル注入）は解消されている。一方、新しい Cookie が `ADMIN_API_KEY` 自体と同じ値を HMAC 鍵にしており、セッションとして必要な秘密分離およびサーバー側有効期限検証を満たしていないため、全体判定は未通過とする。

## Blocking

### B-002: セッション Cookie が ADMIN_API_KEY を平文 payload・HMAC 鍵の両方に使い、サーバー側で失効しない

- **箇所**: `src/index.ts:63-106`, `src/index.ts:114-126`, `src/index.ts:162-175`
- **内容**: ログイン成功時は `signSession(c.env.ADMIN_API_KEY, c.env.ADMIN_API_KEY)` を実行する。そのため Cookie の `.` より前の payload は `ADMIN_API_KEY` そのものであり、HMAC 鍵も同じ値である。HMAC は payload を暗号化しないため、Cookie 値を取得した者は payload から鍵を得て任意の payload の有効な署名を生成できる。
- **失効の問題**: `SESSION_MAX_AGE` は `Set-Cookie` の `Max-Age` にしか使われず、署名済み payload に発行時刻・有効期限・nonce は含まれない。`verifySession()` も時刻検証を一切しないため、Cookie を任意の HTTP クライアントで保持・再送すれば、ブラウザの `Max-Age` を過ぎても Worker は受理する。Cookie 値は同じ ADMIN_API_KEY では毎回決定的に同一になる。
- **影響**: `HttpOnly` は JavaScript の `document.cookie` 読み取りを防ぐだけで、Cookie に含めた管理キーを暗号化しない。Cookie がブラウザの保存領域・プロキシ／サーバーログ・拡張機能等から流出した場合、単なる期限付きセッションではなく、長期認証情報と署名鍵が流出する。攻撃者は Cookie を再利用するだけでなく、任意の有効な Cookie を作成できる。
- **修正方向**: `ADMIN_API_KEY` はログイン時のサーバー側比較だけに限定し、Cookie に入れない。別のサーバー専用 `SESSION_SECRET` を binding として導入し、ランダムな session ID か、発行時刻・短い `exp`・nonce を含む非機密 payload を HMAC-SHA256 署名する。検証側では署名に加えて `exp` を必ず評価する。ランダム ID を使う場合は KV/D1 等でサーバー側失効も可能にする。修正後は、Cookie payload に管理キーの文字列がないこと、期限切れ・改竄 Cookie が 401 になることをテストする。

## Nit

### N-001: 「定数時間比較」の実装が短絡評価する

- **箇所**: `src/index.ts:102-105`
- **内容**: `equal &&= a[i] === b[i]` は最初の不一致以降、右辺を評価しない。そのためコメントとは異なり全バイトを同じ処理量で比較していない。
- **推奨**: 長さ確認後に XOR の差分を全バイトで集約するなど、短絡しない比較にする。実用的なリモートタイミング攻撃は未検証のため blocking には分類しないが、認証用の署名検証ではコメントと実装を一致させるべきである。

### N-002: B-001 修正コミットに無関係な変更が混在している

- **箇所**: `fd26dec`
- **内容**: B-001 の認証修正に加え、DOM テスト基盤、`biome.json`、`package.json`／lockfile、`tsconfig.json`、生成済み `worker-configuration.d.ts` など 16 ファイル・15,462 行が同一コミットに含まれる。
- **推奨**: 認証修正レビューを追跡可能にするため、機能と無関係な基盤更新・生成物は別コミットに分離するか、変更理由を明記する。

## B-001 の再評価

| 確認項目 | 結果 | 根拠 |
| --- | --- | --- |
| Vite `define` によるキー注入の削除 | 解消 | `astro.config.mjs:13-18` に `define` はない。 |
| `import.meta.env.ADMIN_API_KEY` の除去 | 解消 | `git grep 'import.meta.env.ADMIN_API_KEY' -- ':!docs/code-review-round2.md'` は出力なし。 |
| クライアントバンドルへの sentinel 漏洩 | 解消 | `ADMIN_API_KEY=B001_REVIEW_SENTINEL_1d42e341 pnpm run build` は exit 0。fresh `dist/**/*.js` に sentinel と `ADMIN_API_KEY` はともに 0 件。 |
| ログインフォーム | 解消 | `src/components/AdminPage.tsx:80-109,181-220` はパスワードを `POST /api/auth/login` へ送信し、管理 API 呼出しに `credentials: "include"` を設定する。 |
| 管理 API の Cookie 検証 | 部分解消 | `POST /api/links`、`GET /api/links`、`DELETE /api/links/:slug` はすべて `adminAuth` を通り、署名不正・未認証で 401 を返す実装である。ただし B-002 の鍵分離・期限検証が必要。 |
| Cookie 属性 | 実装上は充足 | `src/index.ts:171-174` は `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400` を設定する。 |
| HMAC-SHA256 | 充足 | `src/index.ts:70-81` は Web Crypto の `HMAC` / `SHA-256` を使う。 |

## 実行検証

すべてこのレビューで独立実行した。

| コマンド・確認 | 結果 |
| --- | --- |
| `pnpm run test` | exit 0。3 files / 27 tests。Workers 側 20 tests でログイン成功 200、誤パスワード 401、未認証 CRUD 401、Cookie 認証の CRUD を確認。DOM 側 7 tests も pass。 |
| `pnpm run typecheck` | exit 0。 |
| `pnpm run check` | exit 0（25 files）。 |
| `ADMIN_API_KEY=B001_REVIEW_SENTINEL_1d42e341 pnpm run build` | exit 0。`dist/admin/index.html` を含む fresh build を生成。 |
| fresh `dist/**/*.js` の検索 | sentinel と `ADMIN_API_KEY` は 0 件。 |
| レビュー開始時の `git status --short` | 出力なし。以後の未コミット変更は本レビュー報告書のみ。 |

`wrangler dev` を常駐起動しての別プロセス HTTP smoke は、このレビュー実行環境でバックグラウンドプロセス起動手段が提供されないため未実施とした。代替として、実際の Cloudflare Workers pool を使う上記 Workers テストを実行した。なお `Secure` 属性は本番で必須であり、HTTP の `http://localhost:8787` ブラウザでは Cookie が自動送信されない点に注意が必要である。

## 良い点

- B-001 の根本原因だった Vite `define` と AdminPage の `import.meta.env.ADMIN_API_KEY`／Bearer ヘッダーは削除され、review sentinel を含む値が公開 JavaScript に残っていないことを fresh build で確認した。
- `zValidator` によるログイン・リンク作成入力の境界検証を維持している。
- Tailwind v4 は `@tailwindcss/vite` を用いており、v3 の `tailwind.config.js`／`@tailwind base` パターンは確認されなかった。React 19 の不要な `forwardRef`／`defaultProps` も確認されなかった。
- Cloudflare Worker 側は `c.env` binding を使用し、D1 非対応の `db.transaction()`、生 SQL、Kysely は確認されなかった。
