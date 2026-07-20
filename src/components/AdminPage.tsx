/**
 * AdminPage ─ 管理画面唯一の island。
 *
 * すべての API 呼び出し（GET/POST/DELETE /api/links）をこのコンポーネントで統括する。
 * 子コンポーネントはコールバックで親へ通知し、親が fetch → state 更新を行う
 * （docs/admin-design.md §5）。
 *
 * 認証はサーバサイドセッション Cookie。パスワード検証は POST /api/auth/login
 * で行い、成功時に HttpOnly Cookie が設定される。以降の fetch は credentials: 'include'
 * で Cookie を自動送信する。
 *
 * 一覧 status: loading → list | empty | error。作成/削除成功時は再取得（list を保持したまま
 * 再 fetch し、フェードで更新。空っぽにはしない）。
 */
import { useCallback, useEffect, useState } from "react";
import { type CreateResult, LinkCreateForm } from "@/components/LinkCreateForm";
import { LinkList } from "@/components/LinkList";
import { PageHeader } from "@/components/PageHeader";
import type { Link } from "@/types";

type ListStatus = "loading" | "list" | "empty" | "error";

export function AdminPage() {
  const [links, setLinks] = useState<Link[]>([]);
  const [status, setStatus] = useState<ListStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  /** 一覧を再取得。refetch 中は既存リストを保持し、空っぽにしない。 */
  const refreshLinks = useCallback(async () => {
    let res: Response;
    try {
      res = await fetch("/api/links", {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });
    } catch {
      // ネットワークエラーは初回のみ error 状態へ。既存 list がある場合は保持。
      setErrorMessage("一覧の取得に失敗しました。");
      setStatus((prev) => (prev === "loading" ? "error" : prev));
      return;
    }

    if (!res.ok) {
      setErrorMessage("一覧の取得に失敗しました。");
      setStatus((prev) => (prev === "loading" ? "error" : prev));
      return;
    }

    let data: Link[];
    try {
      data = (await res.json()) as Link[];
    } catch {
      setErrorMessage("一覧の取得に失敗しました。");
      setStatus((prev) => (prev === "loading" ? "error" : prev));
      return;
    }

    setLinks(data);
    setStatus(data.length === 0 ? "empty" : "list");
    setErrorMessage(null);
  }, []);

  // 初回取得：認証済みなら一覧を読み込む
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
    if (isAuthenticated) {
      void refreshLinks();
    }
  }, [refreshLinks, isAuthenticated]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginSubmitting(true);
    setLoginError(null);

    let res: Response;
    try {
      res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ password }),
      });
    } catch {
      setLoginError("通信エラーが発生しました。");
      setLoginSubmitting(false);
      return;
    }

    if (res.ok) {
      setIsAuthenticated(true);
      setPassword("");
    } else {
      setLoginError("パスワードが正しくありません。");
    }
    setLoginSubmitting(false);
  }

  /** POST /api/links を叩き、結果を LinkCreateForm の型で返す。 */
  const createLink = useCallback(
    async (input: { url: string; slug?: string }): Promise<CreateResult> => {
      let res: Response;
      try {
        res = await fetch("/api/links", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(input),
        });
      } catch {
        return {
          ok: false,
          message: "通信エラーが発生しました。しばらくしてから再試行してください。",
        };
      }

      if (res.status === 201) {
        const data = (await res.json()) as { slug: string; shortUrl: string };
        // 作成成功 → 一覧を再取得（list を保持したまま更新）
        void refreshLinks();
        return { ok: true, shortUrl: data.shortUrl };
      }

      // エラー系: メッセージを日本語に寄せる
      if (res.status === 409) {
        return { ok: false, message: "この slug は既に使われています。" };
      }
      if (res.status === 400) {
        return { ok: false, message: "URL または slug の形式が正しくありません。" };
      }
      return {
        ok: false,
        message: "作成に失敗しました。しばらくしてから再試行してください。",
      };
    },
    [refreshLinks],
  );

  /** DELETE /api/links/:slug を叩き、結果を DeleteButton の型で返す。 */
  const deleteLink = useCallback(
    async (slug: string): Promise<{ ok: true } | { ok: false; message: string }> => {
      let res: Response;
      try {
        res = await fetch(`/api/links/${encodeURIComponent(slug)}`, {
          method: "DELETE",
          credentials: "include",
        });
      } catch {
        return { ok: false, message: "通信エラーが発生しました。" };
      }

      if (res.status === 204) {
        void refreshLinks();
        return { ok: true };
      }
      if (res.status === 404) {
        // 既に削除済み。一覧は再取得して矛盾を解消
        void refreshLinks();
        return { ok: false, message: "このリンクは既に削除されています。" };
      }
      return { ok: false, message: "削除に失敗しました。" };
    },
    [refreshLinks],
  );

  if (!isAuthenticated) {
    return (
      <>
        <PageHeader title="管理ログイン" subtitle="" />
        <section className="mx-auto mt-8 max-w-md rounded-card border border-border bg-surface shadow-card">
          <form className="space-y-4 p-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="password" className="block text-body font-bold text-ink">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loginSubmitting}
                className="mt-2 w-full rounded-control border border-border bg-surface px-3 py-2 text-body text-ink focus:border-border-strong focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            {loginError && (
              <p
                role="alert"
                className="rounded-control bg-danger-subtle px-3 py-2 text-meta text-danger"
              >
                {loginError}
              </p>
            )}
            <button
              type="submit"
              disabled={loginSubmitting}
              className="inline-flex h-10 w-full items-center justify-center rounded-control bg-brand px-4 text-body font-bold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loginSubmitting ? "ログイン中…" : "ログイン"}
            </button>
          </form>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader title="リンク管理" subtitle="短縮 URL の作成・一覧・削除" />

      <div className="mt-8 space-y-8">
        <LinkCreateForm origin={origin} onCreate={createLink} />
        <LinkList
          links={links}
          origin={origin}
          status={status}
          errorMessage={errorMessage ?? undefined}
          onRetry={() => {
            void refreshLinks();
          }}
          onDelete={deleteLink}
        />
      </div>
    </>
  );
}
