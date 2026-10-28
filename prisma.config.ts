import "dotenv/config";
import { defineConfig } from "prisma/config";
import { assertSafeDatabaseUrls } from "./src/lib/db/guard";

// Refuses to run unless DATABASE_URL -> "arbitrage", SHADOW_DATABASE_URL -> "arbitrage_shadow",
// and the two URLs differ. Protects your other project databases.
assertSafeDatabaseUrls(process.env.DATABASE_URL, process.env.SHADOW_DATABASE_URL);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DATABASE_URL as string,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
