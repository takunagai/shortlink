/**
 * LinkCreateForm ─ 新規リンク作成フォーム。
 *
 * 状態遷移（docs/admin-design.md §4）:
 *   idle →(submit)→ submitting →(201)→ success(1.5s)→ idle
 *                            ├──(409)→ error: slug 重複
 *                            ├──(400)→ error: URL 不正
 *                            └──(network/5xx)→ error: 通信エラー
 * - submitting: 入力もボタンも disabled。「作成中…」表示。
 * - success: 入力をクリアし成功メッセージ表示（1.5s で自動消去）。親へ通知して一覧を再取得。
 * - error: 入力は保持したまま、フォーム直下にメッセージ。aria-describedby + role=alert。
 *
 * API 呼び出しは親 AdminPage に委譲。本コンポーネントは純粋な UI + コールバック発火。
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type LinkCreateFormProps = {
  origin: string;
  /** 作成を親へ委譲。親は POST /api/links を呼び、成功時に一覧を再取得する。 */
  onCreate: (input: { url: string; slug?: string }) => Promise<CreateResult>;
};

export type CreateResult = { ok: true; shortUrl: string } | { ok: false; message: string };

type FormState = "idle" | "submitting" | "success" | "error";

export function LinkCreateForm({ origin, onCreate }: LinkCreateFormProps) {
  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // success の自動消去タイマーをクリーンアップ
    return () => {
      if (successTimer.current) {
        clearTimeout(successTimer.current);
      }
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "submitting") return;

    setState("submitting");
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedUrl = url.trim();
    const trimmedSlug = slug.trim();
    if (!trimmedUrl) {
      setState("error");
      setErrorMessage("URL を入力してください。");
      return;
    }

    const result = await onCreate({
      url: trimmedUrl,
      slug: trimmedSlug ? trimmedSlug : undefined,
    });

    if (result.ok) {
      // 入力をクリアし、成功メッセージを 1.5s 表示
      setUrl("");
      setSlug("");
      setState("success");
      setSuccessMessage(`${result.shortUrl} を作成しました`);
      if (successTimer.current) {
        clearTimeout(successTimer.current);
      }
      successTimer.current = setTimeout(() => {
        setState("idle");
        setSuccessMessage(null);
        successTimer.current = null;
      }, 1500);
    } else {
      // 入力は保持したまま（修正して再送できるように）
      setState("error");
      setErrorMessage(result.message);
    }
  }

  const disabled = state === "submitting";

  return (
    <section
      className="rounded-card border border-border bg-surface shadow-card"
      aria-labelledby="create-heading"
    >
      <div className="border-b border-border px-6 py-4">
        <h2 id="create-heading" className="text-section leading-tight font-bold text-ink">
          新しいリンク
        </h2>
        <p className="mt-2 text-meta text-muted">短縮 URL を作成します</p>
      </div>

      <form className="space-y-4 p-6" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="url" className="block text-body font-bold text-ink">
            URL{" "}
            <span className="text-danger" aria-hidden="true">
              *
            </span>
            <span className="sr-only">（必須）</span>
          </label>
          <Input
            id="url"
            name="url"
            type="url"
            required
            placeholder="https://example.com/very/long/url"
            autoComplete="off"
            spellCheck="false"
            className="mt-2"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={disabled}
            aria-invalid={state === "error"}
            aria-describedby={errorMessage ? "url-error" : undefined}
          />
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label htmlFor="slug" className="block text-body font-bold text-ink">
              slug
              <span className="font-normal text-meta text-muted">（任意）</span>
            </label>
            <div className="mt-2 flex items-center rounded-control border border-border bg-surface focus-within:border-border-strong">
              <span className="select-none border-r border-border px-3 py-2 text-body text-muted">
                {origin}/
              </span>
              <input
                id="slug"
                name="slug"
                type="text"
                placeholder="my-link"
                autoComplete="off"
                spellCheck="false"
                className="w-full bg-transparent px-3 py-2 text-body text-ink placeholder:text-subtle disabled:cursor-not-allowed disabled:opacity-60"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={disabled}
              />
            </div>
            <p className="mt-2 text-meta text-muted">省略時は自動生成されます</p>
          </div>

          <Button type="submit" intent="primary" size="md" disabled={disabled} className="shrink-0">
            {state === "submitting" ? "作成中…" : "作成"}
          </Button>
        </div>

        {/* フォーム直下のメッセージ: 成功 / エラーを role で明示 */}
        {state === "success" && successMessage && (
          <p
            role="status"
            className="rounded-control bg-accent-subtle px-3 py-2 text-meta text-success"
          >
            {successMessage}
          </p>
        )}
        {state === "error" && errorMessage && (
          <p
            id="url-error"
            role="alert"
            className="rounded-control bg-danger-subtle px-3 py-2 text-meta text-danger"
          >
            {errorMessage}
          </p>
        )}
      </form>
    </section>
  );
}
