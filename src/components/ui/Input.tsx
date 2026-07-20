/**
 * Input ─ 作業画面向けの標準テキスト入力。
 * shadcn/ui の Input 相当を自前実装（意味トークンのみ使用）。
 * React 19: ref を props で受ける。
 */

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type InputProps = ComponentProps<"input">;

export function Input({ className, ref, ...props }: InputProps) {
  return (
    <input
      ref={ref}
      className={cn(
        "block w-full rounded-control border border-border bg-surface px-3 py-2 text-body text-ink placeholder:text-subtle focus:border-border-strong disabled:cursor-not-allowed disabled:bg-canvas disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
