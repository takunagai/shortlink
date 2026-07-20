import { defineConfig } from "drizzle-kit";

// D1（SQLite）向けの Drizzle 設定。
// マイグレーション生成（generate）は driver 不要。
// push / studio でリモート D1 に接続する場合は driver: 'd1-http' と
// dbCredentials（accountId / databaseId / token）を環境変数から読む。
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
});
