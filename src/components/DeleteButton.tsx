/**
 * DeleteButton ─ 削除ボタン + 確認ダイアログ。
 *
 * shadcn/ui の Dialog（Radix）は依存が増えるため、HTML 標準の <dialog> 要素で実装する。
 * - <dialog>.showModal() で開くと :modal 化され、フォーカストラップと ESC 閉じが標準で効く。
 * - docs/admin-design.md §6「キャンセルにフォーカスを当てて開く（誤削除防止）」に従い、
 *   開いた直後にキャンセルボタンへフォーカスを移す。
 *
 * 状態遷移（docs/admin-design.md §4）:
 *   idle →(click)→ confirm →(OK)→ deleting →(204)→ idle（親へ通知）
 *                                  ├──(404)→ error: 既に削除済み
 *                                  └──(network)→ error: 通信エラー
 * エラー時は Dialog を閉じず本文中に表示する。
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

type DeleteButtonProps = {
  slug: string;
  /** 削除実行を親へ委譲。親は DELETE /api/links/:slug を呼び、成功時に一覧を再取得する。
   *  戻り値: 成功か。親が API を叩いた結果（true=204成功, false=404/network 等）を返す。 */
  onDelete: (slug: string) => Promise<DeleteResult>;
};

export type DeleteResult = { ok: true } | { ok: false; message: string };

type State = "idle" | "confirm" | "deleting" | "error";

export function DeleteButton({ slug, onDelete }: DeleteButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<State>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // state と dialog の表示を同期。confirm/error で開き、idle で閉じる。
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (state === "confirm" || state === "deleting" || state === "error") {
      if (!dialog.open) {
        dialog.showModal();
      }
      // 開いた直後にキャンセルへフォーカス（誤削除防止）。ただし削除中は操作不可。
      if (state === "confirm" && cancelRef.current) {
        cancelRef.current.focus();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [state]);

  function handleOpenClick() {
    setErrorMessage(null);
    setState("confirm");
  }

  function handleCancel() {
    // 削除中のキャンセルは無視（API キャンセル手段が無いため）
    if (state === "deleting") return;
    setState("idle");
  }

  async function handleConfirm() {
    setState("deleting");
    setErrorMessage(null);
    const result = await onDelete(slug);
    if (result.ok) {
      setState("idle");
    } else {
      setErrorMessage(result.message);
      setState("error");
    }
  }

  const isWorking = state === "deleting";

  return (
    <>
      <Button
        type="button"
        intent="ghost"
        size="sm"
        onClick={handleOpenClick}
        className="text-danger hover:border-danger hover:bg-danger-subtle"
        aria-label={`/${slug} を削除`}
      >
        削除
      </Button>

      <dialog
        ref={dialogRef}
        onCancel={(event) => {
          // 削除中は ESC 閉じを禁止し、dialog と state の不整合を防ぐ
          if (state === "deleting") {
            event.preventDefault();
          }
        }}
        onClose={() => {
          // ESC やブラウザの close ボタンで閉じられた場合に state を整合させる
          if (state !== "deleting") {
            setState("idle");
          }
        }}
        className="rounded-card border border-border bg-surface p-0 shadow-dialog backdrop:bg-black/30"
      >
        <div className="w-[min(90vw,28rem)] p-6">
          <h3 className="text-section leading-tight font-bold text-ink">リンクを削除</h3>
          <p className="mt-3 text-meta leading-body text-ink">
            <code className="font-mono text-mono text-ink">/{slug}</code>{" "}
            を削除しますか？この操作は取り消せません。
          </p>

          {errorMessage && (
            <p
              role="alert"
              className="mt-3 rounded-control bg-danger-subtle px-3 py-2 text-meta text-danger"
            >
              {errorMessage}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button
              ref={cancelRef}
              type="button"
              intent="ghost"
              size="md"
              onClick={handleCancel}
              disabled={isWorking}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              intent="destructive"
              size="md"
              onClick={handleConfirm}
              disabled={isWorking}
            >
              {isWorking ? "削除中…" : "削除"}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
