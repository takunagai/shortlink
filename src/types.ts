/**
 * 管理画面で扱うリンクの型とヘルパ。
 * バックエンド（src/db/schema.ts）と API（src/index.ts）の戻り値と一致する。
 */

/** GET /api/links の要素、およびテーブル表示で扱うリンク1件。 */
export type Link = {
  id: number;
  slug: string;
  url: string;
  clicks: number;
  /** SQLite datetime('now') の UTC ISO 文字列 "YYYY-MM-DD HH:MM:SS" */
  created_at: string;
};

/** POST /api/links の成功レスポンス。 */
export type CreateLinkResponse = {
  slug: string;
  shortUrl: string;
};

/**
 * 作成日時を表示用 "YYYY-MM-DD HH:MM"（秒省略）に整形する純関数。
 * バックエンドは UTC 文字列で返す。このスコープではタイムゾーン変換は行わず、
 * 文字列のまま秒を切り捨てる（後から Intl 等で拡張できるよう分離しておく）。
 */
export function formatDate(iso: string): string {
  // "2026-07-20 18:02:33" → "2026-07-20 18:02"
  // 想定外の形式（ISO8601 の 'T' 区切り等）も安全に処理するため、先頭16字を取る。
  const sliced = iso.slice(0, 16);
  return sliced.includes("T") ? sliced.replace("T", " ") : sliced;
}
