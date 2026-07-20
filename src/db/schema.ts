import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * 短縮 URL の保存テーブル。
 *
 * 仕様メモ:
 * - created_at は D1（SQLite）の `datetime('now')` で UTC ISO8146 文字列として保持する
 *   （本タスク仕様で text 列指定のため integer timestamp mode は使わない）。
 * - slug はユニーク。base62 ランダム生成またはユーザー指定。
 */
export const links = sqliteTable(
  "links",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    url: text("url").notNull(),
    clicks: integer("clicks").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [uniqueIndex("links_slug_idx").on(t.slug)],
);

export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;
