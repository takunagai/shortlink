# shortlink 修正 Round 1 + 2 独立コードレビュー

## 判定: 未通過

- blocking: 1 件
- non-blocking: 0 件

Round 1 による静的アセット配信・origin・ローカル Worker・dialog 修正は確認できた。一方、Round 2 の Bearer 認証は API キーを管理画面の公開 JavaScript バンドルへ埋め込んでおり、認証情報として機能していない。この blocking を解消するまで通過できない。

## Blocking

### B-001（C-001 未解消）: 管理 API の Bearer トークンが公開 JavaScript に含まれる

- **箇所**: `astro.config.mjs:17-19`, `src/components/AdminPage.tsx:29-33`, `src/components/AdminPage.tsx:75-81`, `src/components/AdminPage.tsx:118-121`
- **内容**: `ADMIN_API_KEY` を Vite の `define` で `import.meta.env.ADMIN_API_KEY` に置換し、`client:load` の `AdminPage` がその値を Authorization ヘッダーに載せている。これはブラウザに配信される JavaScript の定数になる。
- **再現**: レビュー用の非機密値を `ADMIN_API_KEY` に設定して `pnpm run build` を実行したところ、`dist/_astro/AdminPage.*.js` 内に同値と、全 GET/POST/DELETE リクエストでその値を Authorization ヘッダーに設定するコードが出力された。任意の `/admin` 訪問者が DevTools またはバンドル取得で本番キーを取得し、管理 API を呼び出せる。
- **影響**: `src/index.ts:62-72` の比較自体は未認証・不正トークンを 401 にするが、トークンをクライアントへ公開するため、C-001 の「管理 CRUD API が無認証」という脆弱性は実質的に残る。
- **修正方向**: 長期 API キーをクライアントバンドル・Astro props・HTML のいずれにも渡さない。サーバー側で検証するユーザー認証セッション（`HttpOnly`/`Secure` cookie、CSRF 対策を含む）を導入して Worker が認可するか、Cloudflare Access 等で `/admin` と管理 API の到達自体を保護する。修正後は、非機密の sentinel を設定した production build を検査して `dist/` に sentinel が存在しないことをテストする。

## 前回指摘の再評価

| ID | 状態 | 根拠 |
| --- | --- | --- |
| C-001 管理 CRUD API 無認証 | **未解消（B-001）** | ミドルウェアは全3管理 API に適用され、未認証 401 は確認した。ただし Bearer キーが公開バンドルに埋め込まれる。 |
| C-002 Worker から `/admin` を配信しない | 解消 | `wrangler.jsonc:14-17` の assets binding と `src/index.ts:80-101` のアセットフォールバックにより配信される。fresh build は `dist/admin/index.html` を生成し、ローカル Worker の `GET /admin` は 307 経由で 200。 |
| M-001 static build の localhost origin 固定 | 解消 | `src/pages/admin.astro` は origin をビルド時に渡さず、`src/components/AdminPage.tsx:63-67` が実行時の `window.location.origin` を使う。 |
| M-003 build 後の Wrangler dev 失敗 | 解消 | `package.json:7` は `wrangler dev --config wrangler.jsonc`。fresh build 後に指定コマンドでローカル Worker が起動し、assets/D1 binding とも認識された。 |
| m-001 DeleteButton の dialog 状態不整合 | 解消 | `src/components/DeleteButton.tsx:92-105` が削除中の ESC を `preventDefault()` し、その他の close では state を `idle` に同期する。 |

## 実行検証

すべてこのレビューで独立実行した。

| コマンド・確認 | 結果 |
| --- | --- |
| `pnpm run build` | exit 0。`/admin/index.html` を含む `dist/` を生成。Worker エントリは `wrangler.jsonc` の `main: src/index.ts`（Astro static build のため `_worker.js` は生成されない）。 |
| `pnpm run typecheck` | exit 0 |
| `pnpm run check` | exit 0（22 files） |
| `pnpm run test` | exit 0（1 file / 14 tests） |
| `pnpm exec wrangler dev --config wrangler.jsonc --local --port 8787` | 起動成功。レビュー用の非機密トークンを `--var` で与えた。 |
| `GET /admin` | 307 の後、`/admin/` が 200 |
| `GET /api/links`（認証なし） | 401 |
| `GET /api/links`（レビュー用 Bearer） | 200 |
| `DELETE /api/links/review-redirect`（認証なし） | 401 |
| `POST /api/links`（レビュー用 Bearer） | 201 |
| `GET /review-redirect` | 302、作成先 URL の `Location` |

## 良い点

- Tailwind v4 は `src/styles/global.css` の `@import "tailwindcss"` と CSS-first の `@theme` を用いており、v3 ディレクティブや `tailwind.config.js` は追加されていない。
- React 19 コンポーネントは不要な `forwardRef` / `defaultProps` を使わず、管理 UI は意図どおり単一の `client:load` island にまとめられている。
- API 境界の create payload は Zod で検証され、D1/Drizzle のアクセスに生 SQL・D1 非対応の transaction はない。
- `DeleteButton` は標準 dialog の `onCancel` と `onClose` を明示的に扱い、削除中の UI state と close 操作の不整合を防いでいる。
