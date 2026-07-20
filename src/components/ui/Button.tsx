/**
 * Button ─ CVA で primary/destructive/ghost のバリアントを持つボタン。
 * shadcn/ui の Button 相当を自前実装（docs/design-tokens.md の意味トークンを使用）。
 * React 19: forwardRef を使わず ref を props で受ける。
 */
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // 共通: 作業画面向けに角丸・太字・遷移を整える
  "inline-flex items-center justify-center rounded-control font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      intent: {
        // 主操作（作成）。accent は CTA 専用
        primary: "bg-accent text-white hover:bg-accent-hover",
        // 破壊的操作（削除実行）。danger は削除系のみ
        destructive: "bg-danger text-white hover:bg-danger-hover",
        // 控えめ（キャンセル・再取得等）
        ghost: "border border-border bg-surface text-ink hover:bg-canvas",
      },
      size: {
        sm: "px-3 py-1.5 text-meta",
        md: "px-6 py-2 text-body",
      },
    },
    defaultVariants: {
      intent: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ intent, size, className, ref, ...props }: ButtonProps) {
  return (
    <button ref={ref} className={cn(buttonVariants({ intent, size }), className)} {...props} />
  );
}

export { buttonVariants };
