import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { seededDb } from "../helpers/db";
import { users, testimonials } from "@/db/schema";
import { conversionRate, dashboardData, periodFromKey, statusBreakdown } from "@/lib/reports";
import { moderateTestimonial, saveTestimonial, savePost, saveBanner } from "@/lib/admin-content";
import { approvedTestimonials, publishedPosts, liveBanner } from "@/lib/catalogue";
import { ValidationError } from "@/lib/admin-catalogue";

const u = async (email: string) => (await (await seededDb()).select().from(users).where(eq(users.email, email)))[0];

describe("reports", () => {
  it("defines conversion as converted ÷ leads created in the period", () => {
    expect(conversionRate(9, 168)).toBe(5.4);
    expect(conversionRate(0, 0)).toBe(0);
  });

  it("builds the dashboard with consistent totals", async () => {
    const db = await seededDb();
    const data = await dashboardData(db, await u("priya@safarscape.test"), "30d");
    const s = await statusBreakdown(db, periodFromKey("30d"));
    expect(s.total).toBe(s.new + s.contacted + s.quoted + s.converted + s.lost);
    expect(data.conversion).toBe(conversionRate(data.convertedMonth, data.createdMonth));
    expect(data.sources.reduce((a, b) => a + b.n, 0)).toBe(data.thisPeriod);
  });
});

describe("content moderation", () => {
  it("only shows approved testimonials with consent", async () => {
    const db = await seededDb();
    const m = await u("priya@safarscape.test");
    const t = await saveTestimonial(db, m, null, { name: "Real Person", trip: "Goa", quote: "Lovely, well-paced trip.", source: "traveller", consent: false });
    expect(t.status).toBe("pending");
    await expect(moderateTestimonial(db, m, t.id, "approve")).rejects.toBeInstanceOf(ValidationError);
    await db.update(testimonials).set({ consent: true }).where(eq(testimonials.id, t.id));
    await moderateTestimonial(db, m, t.id, "approve");
    expect((await approvedTestimonials(db)).some((x) => x.id === t.id)).toBe(true);
    await moderateTestimonial(db, m, t.id, "reject");
    expect((await approvedTestimonials(db)).some((x) => x.id === t.id)).toBe(false);
  });

  it("schedules posts in the future and validates banners", async () => {
    const db = await seededDb();
    const m = await u("priya@safarscape.test");
    await expect(savePost(db, m, null, { title: "Past schedule", category: "Seasons", status: "scheduled", publishAt: "2000-01-01T00:00" })).rejects.toBeInstanceOf(ValidationError);
    const future = new Date(Date.now() + 86400_000).toISOString();
    const p = await savePost(db, m, null, { title: "Future post", category: "Seasons", status: "scheduled", publishAt: future, body: "x".repeat(60) });
    expect((await publishedPosts(db)).some((x) => x.id === p.id)).toBe(false);
    await expect(saveBanner(db, m, null, { headline: "Hello there", ctaLabel: "Go", ctaHref: "javascript:alert(1)" })).rejects.toBeInstanceOf(ValidationError);
    expect((await liveBanner(db))?.headline).toContain("₹4,000");
  });
});
