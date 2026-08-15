/**
 * LinkList ─ リンク一覧。
 * デスクトップは5列テーブル、モバイル（<md）はカードリスト。
 * 4状態（loading/empty/error/list）をこのコンポーネントで内包する。
 *
 * 親 AdminPage から links と origin と onDelete を受け取る。API 呼び出しは親の領分。
 */
import { DeleteButton, type DeleteResult } from "@/components/DeleteButton";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { formatDate, type Link } from "@/types";

type LinkListProps = {
  /** 一覧データ。null は未取得、[] は取得済み空を区別するため明示的に残す */
  links: Link[];
  origin: string;
  status: "loading" | "empty" | "error" | "list";
  errorMessage?: string;
  /** 再取得ボタン（error 状態で表示）。親の refreshLinks を呼ぶ */
  onRetry?: () => void;
  /** 削除実行を親へ委譲 */
  onDelete: (slug: string) => Promise<DeleteResult>;
};

export function LinkList({
  links,
  origin,
  status,
  errorMessage,
  onRetry,
  onDelete,
}: LinkListProps) {
  const count = links.length;

  return (
    <section
      className="overflow-hidden rounded-card border border-border bg-surface shadow-card"
      aria-labelledby="list-heading"
    >
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 id="list-heading" className="text-section leading-tight font-bold text-ink">
          リンク一覧
        </h2>
        <span className="text-meta tabular-nums text-muted">
          {status === "list" ? `${count} 件` : ""}
        </span>
      </div>

      {status === "loading" && <LoadingBody />}
      {status === "empty" && <EmptyBody />}
      {status === "error" && <ErrorBody message={errorMessage} onRetry={onRetry} />}
      {status === "list" && (
        <>
          {/* デスクトップ: テーブル。
              幅の入り得る列（slug=最大64字・日時）を nowrap にすると md（768px）幅で
              テーブルの min-content が親の幅を超え、overflow-hidden が操作列をクリップする
              （review B-001）。table-fixed + rem 固定列で折返し前提に切り替える:
              slug/元URL は truncate + title、作成日時は nowrap を外して列内で折返す。 */}
          <div className="hidden md:block">
            <table className="w-full table-fixed border-collapse text-body">
              <colgroup>
                {/* 列幅は table-fixed の rem 固定。md=768px で section 幅 718px に対し
                    固定列合計 580px + URL 列が余りを消化する（138px 以上は常に確保）。 */}
                <col className="w-56" />
                <col />
                <col className="w-28" />
                <col className="w-[10.5rem]" />
                <col className="w-[4.75rem]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-canvas text-left">
                  <Th>slug</Th>
                  <Th>元 URL</Th>
                  <Th align="right">クリック</Th>
                  <Th>作成日時</Th>
                  <Th align="right">
                    <span className="sr-only">操作</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {links.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-border last:border-b-0 transition-colors hover:bg-canvas/60"
                  >
                    <td className="px-4 py-3 align-middle">
                      <a
                        href={`${origin}/${l.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`/${l.slug}`}
                        className="block truncate font-mono text-mono text-accent underline-offset-2 hover:underline"
                      >
                        /{l.slug}
                      </a>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={l.url}
                        className="block truncate text-ink hover:text-accent hover:underline"
                      >
                        {l.url}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right align-middle tabular-nums text-ink">
                      {l.clicks.toLocaleString("ja-JP")}
                    </td>
                    <td className="px-4 py-3 align-middle text-meta tabular-nums text-muted">
                      <time dateTime={l.created_at}>{formatDate(l.created_at)}</time>
                    </td>
                    <td className="px-4 py-3 text-right align-middle">
                      <DeleteButton slug={l.slug} onDelete={onDelete} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* モバイル: カードリスト（横スクロールさせない） */}
          <ul className="divide-y divide-border md:hidden">
            {links.map((l) => (
              <li key={l.id} className="space-y-3 px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={`${origin}/${l.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-mono text-mono text-accent underline-offset-2 hover:underline"
                  >
                    /{l.slug}
                  </a>
                  <div className="flex shrink-0 items-start">
                    <DeleteButton slug={l.slug} onDelete={onDelete} />
                  </div>
                </div>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={l.url}
                  className="block break-all text-ink hover:text-accent hover:underline"
                >
                  {l.url}
                </a>
                <dl className="flex gap-4 text-meta text-muted">
                  <div>
                    <dt className="inline">クリック </dt>
                    <dd className="inline tabular-nums text-ink">
                      {l.clicks.toLocaleString("ja-JP")}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">作成 </dt>
                    <dd className="inline tabular-nums text-ink">
                      <time dateTime={l.created_at}>{formatDate(l.created_at)}</time>
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** th 見出しセル。scope=col を必ず付ける（アクセシビリティ）。 */
function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 text-meta font-bold text-muted",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function LoadingBody() {
  // 初回取得時のスケルトン。3行のプレースホルダ。スピナーは使わない。
  // 行 padding を読み込み完了後の行（mobile li px-6 py-4 / desktop td px-4 py-3）に
  // 合わせ、完了時の横ずれを防ぐ（review N-001）。外側の px-6 二重掛けはしない。
  return (
    <div>
      <div className="hidden md:block">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
          >
            <div className="h-4 w-20 animate-pulse rounded-control bg-canvas" />
            <div className="h-4 flex-1 animate-pulse rounded-control bg-canvas" />
            <div className="h-4 w-12 animate-pulse rounded-control bg-canvas" />
            <div className="h-4 w-28 animate-pulse rounded-control bg-canvas" />
            <div className="h-4 w-12 animate-pulse rounded-control bg-canvas" />
          </div>
        ))}
      </div>
      <ul className="divide-y divide-border md:hidden">
        {[0, 1, 2].map((i) => (
          <li key={i} className="space-y-3 px-6 py-4">
            <div className="h-4 w-32 animate-pulse rounded-control bg-canvas" />
            <div className="h-4 w-full animate-pulse rounded-control bg-canvas" />
          </li>
        ))}
      </ul>
      <span className="sr-only" role="status">
        読み込み中
      </span>
    </div>
  );
}

function EmptyBody() {
  // 空状態。インライン SVG アイコン（依存追加なし）+ 中心揃えで「まだ空である」旨を提示。
  return (
    <div className="px-6 py-16 text-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mx-auto h-10 w-10 text-subtle"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      <p className="mt-4 text-body font-bold text-ink">まだリンクがありません。</p>
      <p className="mt-2 text-meta text-muted">上のフォームから作成してください。</p>
    </div>
  );
}

function ErrorBody({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center" role="alert">
      <p className="text-body text-danger">{message ?? "一覧の取得に失敗しました。"}</p>
      {onRetry && (
        <Button type="button" intent="ghost" size="md" onClick={onRetry}>
          再取得
        </Button>
      )}
    </div>
  );
}
