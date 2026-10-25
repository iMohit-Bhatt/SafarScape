import { sql } from "drizzle-orm";
import type { DB } from "@/db";
import { rateLimits } from "@/db/schema";

/**
 * Fixed-window rate limit stored in Postgres so it works across serverless instances.
 * Returns true when the request is allowed.
 */
export async function rateLimit(db: DB, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = new Date();
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, windowStart: now })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.windowStart} < ${new Date(now.getTime() - windowSeconds * 1000)} THEN 1 ELSE ${rateLimits.count} + 1 END`,
        windowStart: sql`CASE WHEN ${rateLimits.windowStart} < ${new Date(now.getTime() - windowSeconds * 1000)} THEN ${now} ELSE ${rateLimits.windowStart} END`,
      },
    })
    .returning();
  return row.count <= limit;
}
