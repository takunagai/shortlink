import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * D1 binding から Drizzle クライアントを生成する。
 *
 * Workers はリクエスト単位で `env.DB` が渡るため、都度この関数で生成する
 * （グローバルに使い回さない）。schema を渡すことで `db.query.<table>` の
 * リレーショナル API が有効になる。
 */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Database = ReturnType<typeof createDb>;
export { schema };
