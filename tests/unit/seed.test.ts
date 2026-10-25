import { describe, it, expect } from "vitest";
import { count, eq } from "drizzle-orm";
import { seededDb } from "../helpers/db";
import * as s from "@/db/schema";

describe("database seed", () => {
  it("creates the demo catalogue, staff and leads", async () => {
    const db = await seededDb();
    const [{ n }] = await db.select({ n: count() }).from(s.packages).where(eq(s.packages.status, "published"));
    expect(n).toBeGreaterThanOrEqual(10);
    const staff = await db.select().from(s.users);
    expect(staff.map((u) => u.role).sort()).toEqual(["manager", "owner", "sales", "sales"]);
    const leads = await db.select().from(s.enquiries);
    expect(leads.every((l) => l.name.startsWith("Demo lead"))).toBe(true);
  });
});
