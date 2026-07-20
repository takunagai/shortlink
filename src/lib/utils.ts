/**
 * clsx で条件結合し、tailwind-merge で Tailwind クラスの衝突を解決する。
 * shadcn/ui の cn() と同じ役割。tailwind-merge は依存に無いため今回は clsx のみ使い、
 * 単純な falsy 除去 + 配列平坦化を行う（本プロジェクトで衝突解決が要るほど複雑な
 * クラス上書きは無い）。依存を増やしすぎない判断。
 */
import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
