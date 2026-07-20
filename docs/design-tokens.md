# shortlink デザイントークン（Tailwind v4 @theme）

shortlink 管理画面（`/admin`）が従う色・タイポグラフィ・スペーシング・コンポーネント指定のトークン定義。Tailwind CSS v4 の CSS-first 記法（`@theme`）で記述する。実装は `tailwind.config.js` を新規作成せず、グローバル CSS に以下の `@theme` ブロックを置くこと。

## 1. 設計方針

- 作業画面（ダッシュボード）向け。LP のような強いアクセント連打ではなく、視認性・操作性・誤操作防止を優先する。
- 配色は 60-30-10 を踏襲: 背景（surface / canvas）60%、区切り・補助面（border / muted）30%、主操作（accent）と破壊的操作（danger）で 10%。
- アクセント（`--color-accent`）は「作成」主操作と、一覧で active な slug リンクなど「押すべき所」のみに集中させる。
- 危険操作（`--color-danger`）は削除系に限定し、アクセントと同時に同じ画面に強く並ばないよう、削除確認 Dialog の中でのみ強調する。
- 全テキストは背景に対して WCAG AA（通常 4.5:1、大文字 3:1）を満たす。OKLCH 値はそれを満たすよう選定。

## 2. グローバル CSS（`src/styles/global.css`）

これをそのまま実装に移植する。Tailwind v4 では `@theme` に変数を書くと `bg-surface` / `text-ink` / `rounded-card` 等のユーティリティが自動生成される。

```css
@import "tailwindcss";

/* クラスベースのダークモード（今回は未使用だが拡張余地として残す） */
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* ============================================================
   * 色 ─ 意味で命名。原色名（blue-500 等）をページに直書きしない
   * ============================================================ */

  /* 背景面 */
  --color-canvas: oklch(0.97 0.004 250);      /* ページ全体の淡いグレー背景 */
  --color-surface: oklch(1 0 0);              /* カード・テーブルの白 */

  /* テキスト */
  --color-ink: oklch(0.27 0.015 260);         /* 本文。canvas/surface に対し AA 通過 */
  --color-muted: oklch(0.51 0.014 260);       /* 補助文・メタ。canvas(0.97) に対し 約 4.6:1 */
  --color-subtle: oklch(0.68 0.012 260);      /* プレースホルダ・アイコン。装飾用 */

  /* 区切り線・枠 */
  --color-border: oklch(0.90 0.006 260);      /* カード枠・テーブル罫線 */
  --color-border-strong: oklch(0.82 0.010 260); /* 入力フォーカス時など */

  /* 主操作（作成）。CTA 専用 */
  --color-accent: oklch(0.55 0.18 255);       /* 青。白文字とのコントラスト 5.2:1 */
  --color-accent-hover: oklch(0.48 0.19 255); /* hover: わずかに暗く */
  --color-accent-subtle: oklch(0.95 0.03 255);/* 成功メッセージ背景 */

  /* 破壊的操作（削除） */
  --color-danger: oklch(0.56 0.20 27);        /* 赤。白文字とのコントラスト 5.0:1 */
  --color-danger-hover: oklch(0.49 0.21 27);
  --color-danger-subtle: oklch(0.96 0.03 27); /* エラー背景 */

  /* 成功（作成完了メッセージ） */
  --color-success: oklch(0.52 0.15 150);      /* 緑 */
  --color-success-subtle: oklch(0.95 0.03 150);

  /* ============================================================
   * フォント ─ OS 標準スタック。日本語 Web フォント・游ゴシック・
   * system-ui は使わない（プロジェクト既定）
   * ============================================================ */
  --font-body: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN",
               "Hiragino Sans", "Noto Sans JP", sans-serif;
  --font-mono: ui-monospace, "SFMono-Regular", "Menlo", "Consolas",
               "Liberation Mono", monospace;
  /* 見出しにディスプレイ体は使わない（作業画面のため body と同一） */
  --font-display: var(--font-body);

  /* ============================================================
   * タイポグラフィ ─ スケール。ジャンプ率は控えめ（作業画面）
   * ============================================================ */
  --text-page-title: 1.75rem;    /* ページヘッダ H1 */
  --text-section: 1.25rem;       /* カード見出し H2 */
  --text-body: 1rem;             /* 本文・入力欄 */
  --text-meta: 0.875rem;         /* メタ・補助 */
  --text-mono: 0.875rem;         /* slug 等の等幅 */

  /* 行間 */
  --leading-tight: 1.25;         /* 見出し */
  --leading-body: 1.6;           /* 本文 */

  /* ============================================================
   * スペーシング ─ 8px グリッド基調（Tailwind 既定の 0.25rem 単位）
   * ============================================================ */
  --spacing: 0.25rem;            /* Tailwind 既定。p-4 = 1rem */

  /* セクション・カードの余白 */
  --spacing-section: 2rem;       /* ページ上下・カード間 (py-8 / gap-8) */
  --spacing-card: 1.5rem;        /* カード内 padding (p-6) */
  --spacing-element: 1rem;       /* 入力欄・ボタン間 (gap-4) */

  /* ============================================================
   * 角丸・影・境界
   * ============================================================ */
  --radius-card: 0.75rem;        /* rounded-card。カード・テーブル枠 */
  --radius-control: 0.5rem;      /* rounded-control。入力欄・ボタン */
  --radius-pill: 9999px;         /* rounded-pill。バッジ */

  --shadow-card: 0 1px 3px 0 rgb(15 23 42 / 0.08),
                 0 1px 2px -1px rgb(15 23 42 / 0.06);
  --shadow-dialog: 0 10px 38px -10px rgb(15 23 42 / 0.25),
                   0 10px 20px -15px rgb(15 23 42 / 0.15);

  --border-width: 1px;           /* 標準の枠線 */

  /* ============================================================
   * ブレイクポイント ─ Tailwind 既定を踏襲（明記しておく）
   * sm: 40rem (640px), md: 48rem (768px), lg: 64rem (1024px)
   * ============================================================ */
}

/* ============================================================
 * ベース ─ body は canvas 背景で本文フォント。フォーカスは可視化
 * ============================================================ */
@layer base {
  body {
    background-color: var(--color-canvas);
    color: var(--color-ink);
    font-family: var(--font-body);
    font-size: var(--text-body);
    line-height: var(--leading-body);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  /* フォーカスリングを潰さない。必要に応じて accent 色で可視化 */
  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
}
```

## 3. トークンと使用箇所の対応表

実装がトークンを迷わず選べるよう、画面の主要要素と使うトークンを対応させる。原則として原色名（`bg-blue-500` 等）を直接ページに書かず、必ず以下の意味トークンを経由する。

### 色

| トークン | 形 | 主な使用箇所 |
|---|---|---|
| `--color-canvas` | `bg-canvas` | ページ全体の背景 |
| `--color-surface` | `bg-surface` | カード（フォーム・一覧）・ Dialog 背景 |
| `--color-ink` | `text-ink` | 本文・見出し・テーブルセル |
| `--color-muted` | `text-muted` | ページヘッダ補足・テーブルのメタ（クリック数・作成日時のラベル） |
| `--color-subtle` | `text-subtle` | プレースホルダ・アイコン・空状態メッセージの補足 |
| `--color-border` | `border-border` | カード枠・テーブル罫線・入力欄の枠 |
| `--color-border-strong` | `border-border-strong` | 入力欄フォーカス時 |
| `--color-accent` | `bg-accent` `text-accent` | 作成ボタン背景・ active な slug リンク文字 |
| `--color-accent-hover` | `bg-accent-hover` | 作成ボタン hover |
| `--color-accent-subtle` | `bg-accent-subtle` | 成功メッセージ背景 |
| `--color-danger` | `bg-danger` `text-danger` | 削除ボタン背景・エラーメッセージ文字 |
| `--color-danger-hover` | `bg-danger-hover` | 削除ボタン hover |
| `--color-danger-subtle` | `bg-danger-subtle` | エラー背景 |
| `--color-success` | `text-success` | 成功メッセージ文字 |
| `--color-success-subtle` | `bg-success-subtle` | （accent-subtle と実質等価。成功系は accent-subtle を使ってもよい） |

### タイポグラフィ

| トークン | 形 | 使用箇所 |
|---|---|---|
| `--text-page-title` | `text-page-title` | ページヘッダ H1 |
| `--text-section` | `text-section` | カード見出し（「新しいリンク」「リンク一覧」等） |
| `--text-body` | `text-body` | 本文・入力欄・ボタンラベル |
| `--text-meta` | `text-meta` | 補助・メタ・ Dialog 本文 |
| `--text-mono` | `text-mono` | slug 表示 |
| `--font-mono` | `font-mono` | slug の等幅表示 |
| `--leading-tight` | `leading-tight` | 見出し |
| `--leading-body` | `leading-body` | 本文・メタ |

太字は `font-weight: bold` を使う。`600` 等の数値指定は避ける（プロジェクト既定）。

### スペーシング・形状

| トークン | 形 | 使用箇所 |
|---|---|---|
| `--spacing-section` | `py-8` 相当 | ページ上下、カード間 |
| `--spacing-card` | `p-6` 相当 | カード内 padding |
| `--spacing-element` | `gap-4` 相当 | フォーム要素間・テーブルセル padding |
| `--radius-card` | `rounded-card` | カード・テーブル外枠 |
| `--radius-control` | `rounded-control` | 入力欄・ボタン |
| `--shadow-card` | `shadow-card` | カード |
| `--shadow-dialog` | `shadow-dialog` | 削除確認 Dialog |

## 4. shadcn/ui コンポーネントとトークンの紐づけ

shadcn は取り込んだコードを直に編集してトークンへ差し替える（npm update しない）。各コンポーネントが参照する CSS 変数は、shadcn 既定（`--primary` / `--destructive` / `--background` 等）ではなく、本ドキュメントの意味トークンに置き換える。対応表:

| shadcn 既定変数 | 本トークン（置換後） |
|---|---|
| `--background` | `--color-surface` |
| `--foreground` | `--color-ink` |
| `--muted` | `--color-canvas` |
| `--muted-foreground` | `--color-muted` |
| `--border` | `--color-border` |
| `--input` | `--color-border`（フォーカスで `--color-border-strong`） |
| `--primary` | `--color-accent`（hover で `--color-accent-hover`） |
| `--primary-foreground` | `oklch(1 0 0)`（白） |
| `--destructive` | `--color-danger`（hover で `--color-danger-hover`） |
| `--destructive-foreground` | `oklch(1 0 0)`（白） |
| `--ring` | `--color-accent` |

shadcn の初期化で生成される CSS 変数群は `:root` に置き、`@theme inline` で Tailwind に橋渡しする。これは Tailwind v4 + shadcn の公式パターン（`ui.shadcn.com/docs/tailwind-v4`）。

```css
:root {
  --radius: 0.5rem;  /* shadcn が参照する基本半径。--radius-control に一致させる */
}

@theme inline {
  --color-background: var(--color-surface);
  --color-foreground: var(--color-ink);
  --color-primary: var(--color-accent);
  --color-primary-foreground: oklch(1 0 0);
  --color-destructive: var(--color-danger);
  --color-destructive-foreground: oklch(1 0 0);
  --color-muted: var(--color-canvas);
  --color-muted-foreground: var(--color-muted);
  --color-border: var(--color-border);
  --color-input: var(--color-border);
  --color-ring: var(--color-accent);
}
```

## 5. アクセシビリティ検証値

主要なテキストと背景のペア。OKLCH の明度差から概算したコントラスト比（実装時は実機の CSS で計測し直すこと）。

| 前景 | 背景 | 比率（概算） | AA |
|---|---|---|---|
| `--color-ink` (L=0.27) | `--color-surface` (L=1.0) | 約 12.6:1 | PASS |
| `--color-ink` (L=0.27) | `--color-canvas` (L=0.97) | 約 11.4:1 | PASS |
| `--color-muted` (L=0.51) | `--color-surface` (L=1.0) | 約 4.6:1 | PASS（通常） |
| `--color-muted` (L=0.51) | `--color-canvas` (L=0.97) | 約 4.2:1 | 注意。小文字不可。`--text-meta` 以上のサイズまたは `--color-ink` に寄せる |
| `--color-subtle` (L=0.68) | `--color-surface` (L=1.0) | 約 2.5:1 | 装飾のみ。テキスト本文・メタには使わない |
| 白 | `--color-accent` (L=0.55) | 約 5.2:1 | PASS |
| 白 | `--color-danger` (L=0.56) | 約 5.0:1 | PASS |

実装時の注意: `--color-muted` を `--color-canvas` 背景に置く箇所（カード外のメタ等）は AA を割り込む恐れがある。メタの表示位置は原則 `--color-surface`（カード内）とし、カード外に置く場合は `--color-ink` に寄せるか、`--text-meta` 相当（14px）以上で太字にする等の調整をする。

## 6. トークン拡張の指針

将来ページを増やす場合（リダイレクト先一覧、クリック詳細 等）も、原色を直書きせずこの `@theme` に意味トークンを追加する。名前は色でなく役割で付ける（`--color-chart-1` ではなく `--color-series-clicks` 等）。
