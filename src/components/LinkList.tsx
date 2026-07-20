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
        <span className="text-meta text-muted">{status === "list" ? `${count} 件` : ""}</span>
      </div>

      {status === "loading" && <LoadingBody />}
      {status === "empty" && <EmptyBody />}
      {status === "error" && <ErrorBody message={errorMessage} onRetry={onRetry} />}
      {status === "list" && (
        <>
          {/* デスクトップ: テーブル */}
          <div className="hidden md:block">
            <table className="w-full border-collapse text-body">
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
                    className="border-b border-border last:border-b-0 hover:bg-canvas/60"
                  >
                    <td className="px-6 py-3 align-middle">
                      <a
                        href={`${origin}/${l.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-mono text-accent underline-offset-2 hover:underline"
                      >
                        /{l.slug}
                      </a>
                    </td>
                    <td className="max-w-[28rem] px-6 py-3 align-middle">
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
                    <td className="px-6 py-3 text-right align-middle tabular-nums text-ink">
                      {l.clicks.toLocaleString("ja-JP")}
                    </td>
                    <td className="px-6 py-3 align-middle text-meta tabular-nums text-muted">
                      <time dateTime={l.created_at}>{formatDate(l.created_at)}</time>
                    </td>
                    <td className="px-6 py-3 text-right align-middle">
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
              <li key={l.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={`${origin}/${l.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-mono text-mono text-accent underline-offset-2 hover:underline"
                  >
                    /{l.slug}
                  </a>
                  <DeleteButton slug={l.slug} onDelete={onDelete} />
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
        "px-6 py-3 text-meta font-bold text-muted",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function LoadingBody() {
  // 初回取得時のスケルトン。3行のプレースホルダ。スピナーは使わない。
  return (
    <div className="px-6 py-4">
      <div className="hidden md:block">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border py-3 last:border-b-0"
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
          <li key={i} className="space-y-3 p-4">
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
  return (
    <div className="px-6 py-16 text-center">
      <p className="text-body text-ink">まだリンクがありません。</p>
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
