import { describe, it, expect } from "vitest";
import { count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { seedIfEmpty, DEMO_PASSWORD } from "@/db/seed";
import * as s from "@/db/schema";
import { submitEnquiry } from "@/lib/enquiries";
import { authenticate } from "@/lib/auth";
import { listLeads, changeStatus } from "@/lib/leads";
import { dashboardData } from "@/lib/reports";
import { publishedPackages } from "@/lib/catalogue";

describe("real Postgres (postgres-js driver)", () => {
  it("refuses to seed with the demo password", async () => {
    const db = await getDb(); // runs migrations (or skips them if already recorded)
    const [{ n }] = await db.select({ n: count() }).from(s.users);
    if (n > 0) return; // already seeded by an earlier run
    const prev = process.env.SEED_ADMIN_PASSWORD;
    process.env.SEED_ADMIN_PASSWORD = DEMO_PASSWORD;
    await expect(seedIfEmpty(db)).rejects.toThrow(/SEED_ADMIN_PASSWORD/);
    if (prev === undefined) delete process.env.SEED_ADMIN_PASSWORD;
    else process.env.SEED_ADMIN_PASSWORD = prev;
  });

  it("migrates, seeds, captures an enquiry and runs CRM + report queries", async () => {
    const db = await getDb();
    process.env.SEED_ADMIN_PASSWORD ??= "Pg-test-password-2026";
    process.env.SEED_DEMO_LEADS = "false";
    await seedIfEmpty(db);
    expect((await publishedPackages(db)).length).toBeGreaterThan(5);

    const login = await authenticate(db, "priya@safarscape.test", process.env.SEED_ADMIN_PASSWORD!);
    expect(login.ok).toBe(true);
    if (!login.ok) return;

    const res = await submitEnquiry(db, {
      kind: "package",
      packageSlug: "kashmir-5n6d",
      name: "Postgres Check",
      phone: `98${String(Date.now()).slice(-8)}`,
      email: "pg-check@example.com",
      consent: true,
      utm: { utm_source: "google" },
    }, { ip: "198.51.100.9" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const [lead] = await db.select().from(s.enquiries).where(eq(s.enquiries.reference, res.reference));
    expect(lead.emailStatus).toBe("sent");

    const { rows } = await listLeads(db, login.user, { q: res.reference });
    expect(rows).toHaveLength(1);
    await changeStatus(db, login.user, lead.id, "lost", { lostReason: "Just browsing" });
    const dash = await dashboardData(db, login.user, "30d");
    expect(dash.status.total).toBeGreaterThan(0);
  });
});
