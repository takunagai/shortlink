import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import app from "../src/index";

const origin = "http://localhost:8787";

function req(path: string, init?: RequestInit) {
  return app.request(`${origin}${path}`, init, env);
}

describe("POST /api/links", () => {
  it("creates a link with 201 and returns slug + shortUrl", async () => {
    const res = await req("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/page" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json<{ slug: string; shortUrl: string }>();
    expect(body.slug).toMatch(/^[A-Za-z0-9_-]{7}$/);
    expect(body.shortUrl).toBe(`${origin}/${body.slug}`);
  });

  it("generates a 7-character base62 slug when omitted", async () => {
    const res = await req("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/foo" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json<{ slug: string }>();
    expect(body.slug).toHaveLength(7);
    expect(body.slug).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("rejects an invalid URL with 400", async () => {
    const res = await req("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "not-a-url" }),
    });

    expect(res.status).toBe(400);
  });

  it("rejects non-http(s) URL with 400", async () => {
    const res = await req("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "ftp://example.com/file" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 409 when slug already exists", async () => {
    const slug = "duplicate-slug";

    const first = await req("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/1", slug }),
    });
    expect(first.status).toBe(201);

    const second = await req("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/2", slug }),
    });
    expect(second.status).toBe(409);
  });

  it("rejects reserved slugs starting with api/ or admin/", async () => {
    for (const slug of ["api/foo", "admin/bar"]) {
      const res = await req("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com/reserved", slug }),
      });
      expect(res.status).toBe(400);
    }
  });
});

describe("GET /:slug redirect", () => {
  it("redirects to the original URL and increments clicks", async () => {
    const slug = "redirect-test";
    const url = "https://example.com/target";

    const create = await req("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, slug }),
    });
    expect(create.status).toBe(201);

    const redirect = await req(`/${slug}`);
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get("Location")).toBe(url);

    const list = await req("/api/links");
    const rows = await list.json<Array<{ slug: string; clicks: number }>>();
    const row = rows.find((r) => r.slug === slug);
    expect(row?.clicks).toBe(1);
  });

  it("returns 404 for an unregistered slug", async () => {
    const res = await req("/no-such-slug");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/links list", () => {
  it("returns links sorted by created_at descending", async () => {
    const slugA = "list-a";
    const slugB = "list-b";

    await req("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/a", slug: slugA }),
    });
    await req("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/b", slug: slugB }),
    });

    const res = await req("/api/links");
    const rows = await res.json<Array<{ slug: string }>>();
    const slugs = rows.map((r) => r.slug);
    const idxA = slugs.indexOf(slugA);
    const idxB = slugs.indexOf(slugB);
    expect(idxA).toBeGreaterThan(-1);
    expect(idxB).toBeGreaterThan(-1);
    expect(idxB).toBeGreaterThan(idxA);
  });
});

describe("DELETE /api/links/:slug", () => {
  it("deletes an existing link and returns 204", async () => {
    const slug = "delete-test";

    await req("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/delete", slug }),
    });

    const del = await req(`/api/links/${slug}`, { method: "DELETE" });
    expect(del.status).toBe(204);

    const redirect = await req(`/${slug}`);
    expect(redirect.status).toBe(404);
  });

  it("returns 404 when deleting an unregistered slug", async () => {
    const res = await req("/api/links/no-such-slug", { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});
