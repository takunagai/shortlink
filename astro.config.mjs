// Astro v7 設定。
// - React island を有効化（@astrojs/react）
// - Tailwind v4 を Vite プラグイン経由で有効化（@tailwindcss/vite）
//
// output は既定の "static"。管理画面 /admin は React island（client:load）が
// クライント側で fetch する純粋なクライアントレンダリングのため、SSR 不要。
// ビルド成果物（dist/）を Hono Worker または Cloudflare Pages で配信する統合は
// eng-lead / cf-engineer の領分（src/index.ts の Hono と Astro のルーティング統合）。
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
