import type { Fetcher } from "@cloudflare/workers-types";
import { zValidator } from "@hono/zod-validator";
import { desc, eq, sql } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import * as z from "zod";
import { createDb } from "./db";
import { links } from "./db/schema";

// 予約パス（slug として使用不可）。/api と /admin はルーティングが存在するため
// 短縮リンクの slug に使うと衝突する。
const RESERVED_PREFIXES = ["api", "admin"];

const isReserved = (slug: string): boolean =>
  RESERVED_PREFIXES.some((p) => slug === p || slug.startsWith(`${p}/`));

// base62 alphabet。7 文字で約 62^7 = 3.5e12 通り。
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function generateSlug(length = 7): string {
  let out = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    out += BASE62[bytes[i] % BASE62.length];
  }
  return out;
}

// zod v4: z.string().url() は任意スキームを許容するため、http/https 制限を regex で明示。
const createLinkSchema = z.object({
  url: z
    .string()
    .url()
    .regex(/^https?:\/\//i, "url must be http(s)"),
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, "slug must be alphanumeric")
    .optional(),
});

const loginSchema = z.object({
  password: z.string().min(1),
});

// slug 指定時の検証フック: 予約語は 400 で弾く。
const validateCreateLink = zValidator("json", createLinkSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: "invalid request", issues: result.error.issues }, 400);
  }
  if (result.data.slug && isReserved(result.data.slug)) {
    return c.json({ error: "slug is reserved" }, 400);
  }
});

type AppEnv = { Bindings: { DB: D1Database; ASSETS: Fetcher; ADMIN_API_KEY: string } };

const app = new Hono<AppEnv>();

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 86400;

/**
 * セッション Cookie 署名ユーティリティ。
 * payload を HMAC-SHA256 で署名し、`payload.signature` 形式で返す。
 */
async function signSession(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${payload}.${signature}`;
}

/**
 * セッション Cookie 検証ユーティリティ。
 * Cookie 値を検証し、署名が正しければ payload を返す。失敗時は null。
 */
async function verifySession(cookie: string, secret: string): Promise<string | null> {
  const lastDot = cookie.lastIndexOf(".");
  if (lastDot === -1) {
    return null;
  }
  const payload = cookie.slice(0, lastDot);
  const _signature = cookie.slice(lastDot + 1);
  const expected = await signSession(payload, secret);
  // 定数時間比較でタイミング攻撃を防ぐ
  const a = new TextEncoder().encode(expected);
  const b = new TextEncoder().encode(cookie);
  if (a.length !== b.length) {
    return null;
  }
  let equal = true;
  for (let i = 0; i < a.length; i++) {
    equal &&= a[i] === b[i];
  }
  return equal ? payload : null;
}

/**
 * 管理 API 用セッション Cookie 認証 middleware。
 * `session` Cookie を検証し、署名が正しく payload が ADMIN_API_KEY と一致すれば通過。
 * 失敗時は 401。
 */
const adminAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const cookie = getCookie(c, SESSION_COOKIE);
  if (!c.env.ADMIN_API_KEY) {
    console.warn("ADMIN_API_KEY is not configured");
  }
  if (!cookie) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const payload = await verifySession(cookie, c.env.ADMIN_API_KEY);
  if (payload !== c.env.ADMIN_API_KEY) {
    return c.json({ error: "unauthorized" }, 401);
  }
  await next();
};

/**
 * 静的アセットフォールバック。
 * /api/* と /:slug（短縮URLリダイレクト）以外のリクエストは dist/ の
 * 静的アセットを優先して返す。これにより /admin など Astro ビルド成果物が
 * 同一 Worker から配信される。
 */
app.use("*", async (c, next) => {
  const pathname = new URL(c.req.url).pathname;
  // API と slug リダイレクトは Hono ルートで処理する
  if (pathname.startsWith("/api/")) {
    return next();
  }
  // 予約語で始まるパスも静的アセット優先（/admin 等）
  if (RESERVED_PREFIXES.some((p) => pathname === `/${p}` || pathname.startsWith(`/${p}/`))) {
    const asset = await c.env.ASSETS.fetch(c.req.url);
    if (asset.status !== 404) {
      return asset;
    }
    return next();
  }
  // それ以外（通常の短縮 slug）もまず静的アセットを確認し、
  // 404 なら下位の /:slug リダイレクトへフォールバック
  const asset = await c.env.ASSETS.fetch(c.req.url);
  if (asset.status !== 404) {
    return asset;
  }
  return next();
});

/**
 * 管理画面ログイン。
 * パスワードが ADMIN_API_KEY と一致すれば署名付き session Cookie を返す。
 */
app.post("/api/auth/login", zValidator("json", loginSchema), async (c) => {
  const { password } = c.req.valid("json");
  if (!c.env.ADMIN_API_KEY) {
    return c.json({ error: "unauthorized" }, 401);
  }
  if (password !== c.env.ADMIN_API_KEY) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const value = await signSession(c.env.ADMIN_API_KEY, c.env.ADMIN_API_KEY);
  c.header(
    "Set-Cookie",
    `${SESSION_COOKIE}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE}`,
  );
  return c.json({ ok: true }, 200);
});

/**
 * 新規短縮リンク作成。
 * - slug 省略時: base62 ランダム 7 文字を生成し、衝突時は再生成（最大 5 回）。
 * - slug 指定時: 既存衝突は 409。
 */
app.post("/api/links", adminAuth, validateCreateLink, async (c) => {
  const { url, slug: requested } = c.req.valid("json");
  const db = createDb(c.env.DB);

  // slug 決定
  let slug = requested;
  if (!slug) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateSlug();
      const existing = await db
        .select({ slug: links.slug })
        .from(links)
        .where(eq(links.slug, candidate))
        .get();
      if (!existing) {
        slug = candidate;
        break;
      }
    }
    if (!slug) {
      return c.json({ error: "failed to generate unique slug" }, 503);
    }
  } else {
    // 指定 slug の重複チェック
    const existing = await db
      .select({ slug: links.slug })
      .from(links)
      .where(eq(links.slug, slug))
      .get();
    if (existing) {
      return c.json({ error: "slug already exists" }, 409);
    }
  }

  await db.insert(links).values({ slug, url });

  // shortUrl はリクエストの origin を使う（デプロイ先のホストを反映）。
  const origin = new URL(c.req.url).origin;
  return c.json({ slug, shortUrl: `${origin}/${slug}` }, 201);
});

/**
 * 全リンク一覧（作成日時降順）。created_at は text 列だが ISO8601 文字列で
//  格納されているため辞書順 = 時系列順になり、desc で降順になる。
 */
app.get("/api/links", adminAuth, async (c) => {
  const db = createDb(c.env.DB);
  const rows = await db
    .select({
      id: links.id,
      slug: links.slug,
      url: links.url,
      clicks: links.clicks,
      created_at: links.createdAt,
    })
    .from(links)
    .orderBy(desc(links.createdAt))
    .all();
  return c.json(rows);
});

/**
 * リンク削除。存在しなければ 404、あれば削除して 204。
 */
app.delete("/api/links/:slug", adminAuth, async (c) => {
  const slug = c.req.param("slug");
  const db = createDb(c.env.DB);

  const existing = await db.select({ id: links.id }).from(links).where(eq(links.slug, slug)).get();
  if (!existing) {
    return c.json({ error: "not found" }, 404);
  }
  await db.delete(links).where(eq(links.slug, slug));
  return c.body(null, 204);
});

/**
 * 短縮リンクのリダイレクト。
 * /api, /admin で始まる slug はここで処理せず 404（実際のルーティング優先）。
 * - 存在しない slug は 404 HTML ページ。
 * - 存在する slug は clicks を +1 して 302 リダイレクト。
 */
app.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (isReserved(slug)) {
    return c.notFound();
  }

  const db = createDb(c.env.DB);
  const row = await db.select({ url: links.url }).from(links).where(eq(links.slug, slug)).get();

  if (!row) {
    return c.html(
      "<!doctype html><html><body><h1>404 Not Found</h1><p>Short link not found.</p></body></html>",
      404,
    );
  }

  // クリック数インクリメント。リダイレクトは update 成否に依存させない。
  await db.update(links).set({ clicks: sql`clicks + 1` }).where(eq(links.slug, slug));

  return c.redirect(row.url, 302);
});

export default app;
export { signSession, verifySession };
