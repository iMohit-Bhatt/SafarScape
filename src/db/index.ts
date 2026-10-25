import "server-only";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * One database client for the whole app.
 *
 * DATABASE_URL:
 *  - postgres://… or postgresql://…  → real Postgres (Neon / Supabase) via postgres-js
 *  - pglite://memory                  → in-memory Postgres (tests)
 *  - pglite://./.data/pglite          → embedded Postgres on disk (local development, default)
 */
export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

type Holder = { db?: DB; ready?: Promise<DB> };
const globalForDb = globalThis as unknown as { __safarscapeDb?: Holder };
const holder: Holder = (globalForDb.__safarscapeDb ??= {});

async function create(): Promise<DB> {
  const url = process.env.DATABASE_URL ?? "pglite://./.data/pglite";
  const migrationsFolder = path.join(process.cwd(), "drizzle");

  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const client = postgres(url, { max: 5, prepare: false });
    const db = drizzle(client, { schema });
    if (process.env.DB_AUTO_MIGRATE !== "false") await migrate(db, { migrationsFolder });
    return db as unknown as DB;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const location = url.replace("pglite://", "");
  let client: InstanceType<typeof PGlite>;
  if (location === "memory") client = new PGlite();
  else {
    const dir = path.resolve(location);
    // PGlite won't create missing parent folders (e.g. a fresh checkout without ./.data).
    const { mkdirSync } = await import("node:fs");
    mkdirSync(path.dirname(dir), { recursive: true });
    client = new PGlite(dir);
  }
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return db as unknown as DB;
}

/** Returns the ready database (runs migrations once per process). */
export async function getDb(): Promise<DB> {
  if (holder.db) return holder.db;
  holder.ready ??= create().then(async (db) => {
    holder.db = db;
    if (process.env.SEED_ON_START !== "false") {
      const { seedIfEmpty } = await import("./seed");
      await seedIfEmpty(db);
    }
    return db;
  });
  return holder.ready;
}

export { schema };
