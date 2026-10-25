import { sql } from "drizzle-orm";
import type { DB } from "@/db";
import { rateLimits } from "@/db/schema";

/**
 * Fixed-window rate limit stored in Postgres so it works across serverless instances.
 * Returns true when the request is allowed.
 */
export async function rateLimit(db: DB, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = new Date();
  // Raw SQL fragments get ISO strings + explicit casts: postgres-js (production) can't bind Date objects here.
  const nowIso = sql`${now.toISOString()}::timestamptz`;
  const cutoff = sql`${new Date(now.getTime() - windowSeconds * 1000).toISOString()}::timestamptz`;
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, windowStart: now })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.windowStart} < ${cutoff} THEN 1 ELSE ${rateLimits.count} + 1 END`,
        windowStart: sql`CASE WHEN ${rateLimits.windowStart} < ${cutoff} THEN ${nowIso} ELSE ${rateLimits.windowStart} END`,
      },
    })
    .returning();
  return row.count <= limit;
}
