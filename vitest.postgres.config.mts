import { defineConfig } from "vitest/config";
import path from "node:path";

/** Runs the integration suite against a real Postgres (e.g. a Supabase project): TEST_POSTGRES_URL=... npm run test:postgres */
export default defineConfig({
  resolve: { tsconfigPaths: true, alias: { "server-only": path.resolve("tests/helpers/empty.ts") } },
  test: {
    environment: "node",
    include: ["tests/postgres/**/*.test.ts"],
    setupFiles: ["tests/postgres/setup.ts"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    pool: "forks",
    fileParallelism: false,
  },
});
