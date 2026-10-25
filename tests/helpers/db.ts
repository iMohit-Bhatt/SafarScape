import { getDb, type DB } from "@/db";
import { seed } from "@/db/seed";

let seeded: Promise<DB> | undefined;
/** A fresh in-memory Postgres per test file, seeded with demo data. */
export function seededDb(): Promise<DB> {
  seeded ??= getDb().then(async (db) => {
    await seed(db);
    return db;
  });
  return seeded;
}
