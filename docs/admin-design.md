# shortlink 管理画面 /admin ─ 情報設計・デザイン仕様

URL 短縮サービスの管理画面（`GET /admin`）の情報設計・レイアウト・状態遷移・コンポーネント分割を定義する。実装担当（coder）はこの文書と `docs/design-tokens.md` を正として React 19 + Astro + Tailwind v4 で実装する。

バックエンド API 仕様（別タスク `t_e572e1b5` で実装）:

| メソッド | パス | 役割 |
|---|---|---|
| GET | `/api/links` | 全リンクを created_at 降順で返す。`[{ id, slug, url, clicks, created_at }]` |
| POST | `/api/links` | `{ url, slug? }` を受け取り `{ slug, shortUrl }` を返す（201）。slug 重複は 409 `{ error: "slug already exists" }`。url 不正は 400 |
| DELETE | `/api/links/:slug` | 該当 slug を削除（204）。無ければ 404 |

## 1. ページの目的と設計方針

- 目的: 運用者（サービス管理者）が、短縮リンクの作成・一覧確認・削除を1画面で完結させること。
- 利用頻度: 日常的に何度も開くダッシュボード型。装飾より、操作の速さ・一覧性・誤操作防止を優先する。
- 画面構成の骨: 上部にページヘッダ、その直下に「作成フォーム」、メインに「一覧テーブル」。LP のように訴求軸を積み上げるページではなく、作業画面として設計する。
- 操作の中心は「作成」と「削除」。作成は主操作（アクセント）、削除は破壊的操作（danger）として視覚的に明確に区別する。

## 2. レイアウト（デスクトップ・モバイル共通骨格）

単一カラム。最大幅を絞って読みやすさと操作性を確保する。

```
┌─────────────────────────────────────────────┐
│ PageHeader                                  │   max-w-5xl, py-8
│  ───────────────                            │
│  タイトル: リンク管理                        │
│  補足: 短縮 URL の作成・一覧・削除（コピー待ち）│
├─────────────────────────────────────────────┤
│ LinkCreateForm  （カード: bg-surface, border, │
│   rounded-card, shadow-card, p-6）           │
│   [ URL 入力 （必須, 全幅）                 ] │
│   [ slug 入力（任意, 半幅）] [ 作成ボタン ]   │
│   ※ エラー/成功メッセージをフォーム直下に表示 │
├─────────────────────────────────────────────┤
│ LinkList  （カード: bg-surface, border,      │
│   rounded-card, overflow-hidden）            │
│  ┌─ テーブルヘッダ ──────────────────────┐  │
│  │ slug | 元 URL | クリック | 作成日時 |   │  │
│  ├──────────────────────────────────────┤  │
│  │ /abc123  https://example.com/...  42  │  │
│  │           2026-07-20 18:02    [削除]   │  │
│  └──────────────────────────────────────┘  │
│  ※ ローディング / 空 / エラー状態をここに表示│
└─────────────────────────────────────────────┘
```

### デスクトップ（md 以上, ≥768px）

- ページ全体: `max-w-5xl mx-auto px-6`
- 作成フォーム: URL 入力を上段全幅、slug 入力（任意）と作成ボタンを下段に並べる（slug が `flex-1`、作成ボタンが `shrink-0`）。
- 一覧テーブル: 5 列（slug / 元 URL / クリック / 作成日時 / 操作）。元 URL 列は幅を取り、長い URL は `truncate` で省略して `title` 属性で全文提示。

### モバイル（< 768px）

- ページ全体: `px-4`
- 作成フォーム: URL / slug / 作成ボタンを縦並び。
- 一覧テーブル: 表形式を維持せず、1 リンク = 1 卡片に行を変える（カードリスト）。`slug`・`元 URL`・`メタ（クリック数・作成日時）`・`削除` を縦に積む。テーブルを横スクロールさせない。

列幅の目安（デスクトップ）:

| 列 | 幅の目安 | 備考 |
|---|---|---|
| slug | 120px 固定寄り | `/{slug}` を表示、`font-mono` |
| 元 URL | 残りを占有 | `truncate` + `title` |
| クリック | 80px | 右寄せ、`tabular-nums` |
| 作成日時 | 160px | `YYYY-MM-DD HH:MM` |
| 操作 | 80px | 削除ボタン |

## 3. コンポーネントツリー

実装タスク `t_e670aec9` の指定に従う。Astro ページがReact island を1つ置き、その中にフォーム・一覧・削除を束ねる。一覧とフォームは同一 state に依存するため、別 island に分けず1つの `AdminPage` island（`client:load`）にまとめる。

```
src/pages/admin.astro
└─ <AdminPage client:load />          ← 唯一の island。状態を持つ親
   ├─ <PageHeader />                  ← 静的（.astro 側に置いてもよいが、 island 内でも可）
   ├─ <LinkCreateForm />              ← URL/slug 入力・作成
   │    └─ <Button intent="primary">  ← shadcn Button（主操作）
   ├─ <LinkList />                    ← 一覧（ローディング/空/エラー状態を内包）
   │    └─ <LinkRow /> (各行)
   │         ├─ slug（リンク: `/${slug}` への遷移、別タブ）
   │         ├─ 元 URL（`<a href={url}>`、truncate）
   │         ├─ クリック数
   │         ├─ 作成日時
   │         └─ <DeleteButton />      ← 確認ダイアログ付き
   │              └─ <Dialog>         ← shadcn Dialog で「削除してよいか」確認
   └─ <Toast> / インラインメッセージ   ← 作成成功・エラーのフィードバック
```

shadcn/ui から取り込むコンポーネント（目安）:

- `Button`（primary / destructive / ghost の3バリアント）
- `Input`（URL・slug 入力）
- `Dialog`（削除確認）
- `Table`（一覧。`Table / TableHeader / TableBody / TableRow / TableHead / TableCell`）
- `Tooltip` は必須でない（`title` 属性で代用可）。必要なら追加。

## 4. 状態遷移

状態は `AdminPage` が単一ソースとして持ち、`useState` で管理する（Zustand 必須でない）。子コンポーネントはコールバックで親に通知し、親が API を叩いて一覧を再取得する。

### 一覧（LinkList）の状態

```
             ┌── loading ──┐
mount ──────►│  fetching   │── 成功(データあり)──► list
             └─────────────┘                         ▲
                  │                                   │
                  ├── 成功(データ空) ──► empty ────────┤
                  │                                   │
                  └── 失敗 ──────────► error ─────────┤
                                                      │
   作成成功 / 削除成功 ──► refetch ──► loading? ──────┘
   （refetch 中は既存リストを保持し、フェードで更新。空っぽにしない）
```

| 状態 | 表示 |
|---|---|
| loading（初回） | テーブル枠のみ、各行にスケルトン（`animate-pulse` された白い行 × 3）。スピナーは不可笑しいので使わない |
| empty | カード中央に「まだリンクがありません。上のフォームから作成してください。」のメッセージと、フォームへのアンカー（または単なるテキスト） |
| error | カード内に赤系（`text-danger`）のメッセージ「一覧の取得に失敗しました。」+ 再取得ボタン（ghost） |
| list | テーブル本体 |

### 作成（LinkCreateForm）の状態

```
idle ──(submit)──► submitting ──(201)──► success ──(1.5s)──► idle
                         │                  │
                         │                  └──(409)──► error: slug 重複
                         │                  └──(400)──► error: URL 不正
                         └──(network/5xx)──► error: 通信エラー
```

- `submitting`: 作成ボタンを `disabled`、入力欄も `disabled`。ボタン内に「作成中…」を表示（スピナー省略可）。
- `success`: 入力欄をクリアし、フォーム直下に成功メッセージ「`{shortUrl}` を作成しました」。1.5 秒後に自動消去。作成成功と同時に親へ通知して一覧を再取得。
- `error`: フォーム直下にエラーメッセージ。入力は保持したまま（ユーザーが修正して再送できるように）。

### 削除（DeleteButton）の状態

```
idle ──(click)──► confirm(open Dialog) ──(OK)──► deleting ──(204)──► idle
                                              ├──(404)──► error: 既に削除済み
                                              └──(network)──► error: 通信エラー
```

- `confirm`: Dialog を開き「`/{slug}` を削除しますか？この操作は取り消せません。」を表示。キャンセルと削除（destructive ボタン）を並べる。
- `deleting`: 削除ボタンを `disabled`、Dialog 内のテキストを「削除中…」に。
- `error`: Dialog 内にエラーを表示、Dialog は閉じない。
- `success`: Dialog を閉じ、親へ通知して一覧を再取得。

## 5. データフローと API 接続

`AdminPage` が全 API 呼び出しを統括する。子コンポーネントは純粋な表示 + コールバック発火にとどめる（API を直接叩かない）。

```
LinkCreateForm                      LinkList / LinkRow / DeleteButton
   │                                          │
   │ onSubmit({url, slug?})                   │ onDelete(slug)
   ▼                                          ▼
┌───────────────────── AdminPage ─────────────────────┐
│                                                       │
│  createLink({url, slug})                              │
│    → POST /api/links                                  │
│    → on success: refreshLinks()                       │
│                                                       │
│  deleteLink(slug)                                     │
│    → DELETE /api/links/:slug                          │
│    → on success: refreshLinks()                       │
│                                                       │
│  refreshLinks()                                       │
│    → GET /api/links → setLinks()                      │
│                                                       │
│  useEffect(() => refreshLinks(), [])  ← 初回取得      │
└───────────────────────────────────────────────────────┘
```

型定義（バックエンドと一致。実装側で `src/types.ts` 等に置く）:

```ts
type Link = {
  id: number;
  slug: string;
  url: string;
  clicks: number;
  created_at: string; // SQLite datetime('now') → "YYYY-MM-DD HH:MM:SS" (UTC)
};
```

`created_at` は UTC の文字列として扱う。表示は `YYYY-MM-DD HH:MM`（秒は省略）。ローカルタイムゾーン変換はこのスコープでは必須でないが、実装で容易に拡張できるよう、`formatDate(iso: string): string` のような純関数に切り出すこと。

`shortUrl` の表示: `POST` 成功レスポンスの `shortUrl`（`${origin}/${slug}`）をそのまま使う。一覧テーブルの slug 列も `${origin}/${slug}` を表示し、クリックで別タブ遷移（`target="_blank" rel="noopener noreferrer"`）。

## 6. アクセシビリティ

- フォーム: `<label>` を各入力欄に付ける（`htmlFor` で紐付け）。URL は必須（`required`）、slug は任意。
- エラー表示: `aria-describedby` で入力欄とエラーメッセージを紐付け、`role="alert"` で即時通知。
- 削除 Dialog: shadcn Dialog は既定でフォーカストラップと ESC 閉じを持つ。キャンセルにフォーカスを当てて開く（誤削除防止）。
- テーブル: `<table>` / `<thead>` / `<tbody>` を正しく使い、`<th scope="col">` で列見出しを明示。
- キーボード: タブ順序が ヘッダ → フォーム入力 → 作成 → 一覧各行 → 削除 の自然な流れになること。
- コントラスト: 本文・メタテキストはトークン（`text-ink` / `text-muted`）経由で AA を満たす。`design-tokens.md` 参照。

## 7. コピー（実装時の埋め込み位置）

実コピーは coder が埋め込む。以下は意図と文字数目安。トーンは事務的・簡潔（LP のような訴求表現は使わない）。

| 位置 | 内容の意図 | 文字数目安 |
|---|---|---|
| PageHeader タイトル | この画面の名前。「リンク管理」 | 6 字程度 |
| PageHeader 補足 | 何ができるか一言。「短縮 URL の作成・一覧・削除」 | 15 字程度 |
| フォーム 見出し（任意） | 「新しいリンク」等。省略してフォームのみでも可 | 8 字程度 |
| URL ラベル | 「URL」または「短縮元の URL」 | 8 字程度 |
| slug ラベル | 「slug（任意）」 | 10 字程度 |
| slug 補足 | 「省略時は自動生成」 | 10 字程度 |
| 作成ボタン | 「作成」 | 2 字 |
| 空状態メッセージ | 「まだリンクがありません。」+ フォームへの誘導 | 20 字程度 |
| 削除 Dialog 本文 | 「`/{slug}` を削除しますか？この操作は取り消せません。」 | 30 字程度 |
| 削除 Dialog 実行 | 「削除」 | 2 字 |
| 削除 Dialog キャンセル | 「キャンセル」 | 4 字 |

コピー未確定箇所はカンプ内に `【コピー待ち: ...】` で明示する。

## 8. 設計判断の要点（実装時に揺らがないもの）

- 装飾を排した作業画面。LP 的ヒーロー・訴求ブロック・社会的証明は置かない。
- アクセント（`--color-accent`）は「作成」主操作のみに使用。削除は `--color-danger`。
- 一覧のソートは created_at 降順で固定（API が既に降順で返す）。フロントでのソート UI は持たない。
- ページネーション・検索・フィルタはこのスコープでは扱わない（別タスクで拡張）。リンク件数が増えた場合のフォールバックは未規定。
- ログイン・認証はこの画面のスコープ外。実装側で後から保護を足せるよう、`AdminPage` の外側（ルート側）でガードすることを想定した作りにする（この文書では指定しない）。
- リロードで状態が消えないよう、フォームの入力値は必要なら `localStorage` に保持してもよいが、必須ではない（実装の自由度に任せる）。

## 9. 実装の進め方（coder 向けの暗示）

1. `docs/design-tokens.md` の `@theme` ブロックを `src/styles/global.css` に移植。
2. shadcn/ui の初期化（`pnpm dlx shadcn@latest init`）→ Button / Input / Dialog / Table を追加。
3. 型 `Link` を定義し、`AdminPage` の state 設計から着手。
4. `LinkCreateForm` → `LinkList` → `DeleteButton` の順に組み立て、各状態（loading/empty/error）を必ず扱う。
5. デスクトップ・モバイル両方で 375 / 768 / 1280px を確認。テーブルがモバイルで横スクロールしないよう、ブレイクポイントでカードリストに切り替える。
