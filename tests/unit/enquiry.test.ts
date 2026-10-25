import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { seededDb } from "../helpers/db";
import { submitEnquiry, retryEnquiryEmail, deriveSource } from "@/lib/enquiries";
import { setEmailProviderForTests } from "@/lib/email";
import { enquiries, emailLog, leadActivities, rateLimits } from "@/db/schema";
import { setSetting } from "@/lib/settings";
import { defaultSettings } from "@/db/seed-data";

let n = 0;
const uniquePhone = () => `98${String(10000000 + ++n * 7919).slice(-8)}`;
const base = () => ({
  kind: "package",
  name: "Ananya Rao",
  phone: uniquePhone(),
  email: "ananya@example.com",
  packageSlug: "kashmir-5n6d",
  adults: 2,
  children: 0,
  consent: true,
  travelMonth: "Jan 2027",
});

describe("enquiry submission", () => {
  beforeEach(async () => {
    const db = await seededDb();
    await db.delete(rateLimits);
    setEmailProviderForTests(null);
  });
  afterEach(() => setEmailProviderForTests(null));

  it("saves the lead, emails the team and the traveller", async () => {
    const db = await seededDb();
    const res = await submitEnquiry(db, { ...base(), utm: { utm_source: "instagram", utm_campaign: "kashmir_winter" } }, { ip: "1.1.1.1" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.reference).toMatch(/^SFS-\d{5}$/);
    const [lead] = await db.select().from(enquiries).where(eq(enquiries.reference, res.reference));
    expect(lead.phone).toMatch(/^\+919/);
    expect(lead.source).toBe("instagram");
    expect(lead.utm.utm_campaign).toBe("kashmir_winter");
    expect(lead.status).toBe("new");
    expect(lead.emailStatus).toBe("sent");
    expect(lead.packageId).not.toBeNull();
    const mails = await db.select().from(emailLog).where(eq(emailLog.enquiryId, lead.id));
    expect(mails.map((m) => m.kind).sort()).toEqual(["autoreply", "team"]);
    expect(mails.find((m) => m.kind === "team")!.to).toBe(defaultSettings.emailRecipients[0]);
    expect(mails.find((m) => m.kind === "autoreply")!.body).toContain(res.reference);
  });

  it("rejects invalid input with field errors and stores nothing", async () => {
    const db = await seededDb();
    const before = (await db.select().from(enquiries)).length;
    const res = await submitEnquiry(db, { ...base(), name: "A", phone: "123", email: "nope", consent: false }, { ip: "1.1.1.2" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.status).toBe(422);
    expect(Object.keys(res.fieldErrors!)).toEqual(expect.arrayContaining(["name", "phone", "email", "consent"]));
    expect((await db.select().from(enquiries)).length).toBe(before);
  });

  it("keeps the lead when email fails, marks it failed, and retry succeeds", async () => {
    const db = await seededDb();
    setEmailProviderForTests({ name: "broken", send: async () => { throw new Error("SMTP down"); } });
    const res = await submitEnquiry(db, base(), { ip: "1.1.1.3" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const [lead] = await db.select().from(enquiries).where(eq(enquiries.reference, res.reference));
    expect(lead.emailStatus).toBe("failed");
    const failed = await db.select().from(emailLog).where(eq(emailLog.enquiryId, lead.id));
    expect(failed.every((m) => m.status === "failed" && m.error === "SMTP down")).toBe(true);

    setEmailProviderForTests(null);
    expect(await retryEnquiryEmail(db, lead.id)).toBe(true);
    const [after] = await db.select().from(enquiries).where(eq(enquiries.id, lead.id));
    expect(after.emailStatus).toBe("sent");
    const acts = await db.select().from(leadActivities).where(eq(leadActivities.enquiryId, lead.id));
    expect(acts.some((a) => a.body === "Team notification re-sent")).toBe(true);
  });

  it("silently drops honeypot submissions", async () => {
    const db = await seededDb();
    const before = (await db.select().from(enquiries)).length;
    const res = await submitEnquiry(db, { ...base(), website: "http://spam" }, { ip: "1.1.1.4" });
    expect(res.ok).toBe(true);
    expect((await db.select().from(enquiries)).length).toBe(before);
  });

  it("returns the original reference for a quick duplicate", async () => {
    const db = await seededDb();
    const payload = base();
    const a = await submitEnquiry(db, payload, { ip: "1.1.1.5" });
    const b = await submitEnquiry(db, payload, { ip: "1.1.1.5" });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(b.reference).toBe(a.reference);
      expect(b.duplicate).toBe(true);
    }
  });

  it("rate-limits bursts from one IP", async () => {
    const db = await seededDb();
    const results = [];
    for (let i = 0; i < 10; i++) results.push(await submitEnquiry(db, base(), { ip: "9.9.9.9" }));
    const limited = results.filter((r) => !r.ok && r.status === 429);
    expect(limited.length).toBe(2);
  });

  it("routes destination enquiries to the matching team inbox", async () => {
    const db = await seededDb();
    await setSetting(db, "routingRules", [{ destinationSlugs: ["kashmir"], to: "kashmir-desk@example.com" }]);
    const res = await submitEnquiry(db, base(), { ip: "1.1.1.6" });
    await setSetting(db, "routingRules", []);
    if (!res.ok) throw new Error("expected ok");
    const [lead] = await db.select().from(enquiries).where(eq(enquiries.reference, res.reference));
    const to = (await db.select().from(emailLog).where(eq(emailLog.enquiryId, lead.id)))
      .filter((m) => m.kind === "team")
      .map((m) => m.to);
    expect(to).toEqual(["kashmir-desk@example.com", defaultSettings.emailRecipients[0]]);
  });

  it("accepts custom-trip enquiries without a package", async () => {
    const db = await seededDb();
    const res = await submitEnquiry(
      db,
      { ...base(), kind: "custom", packageSlug: undefined, details: { destinations: ["Kerala", "Andaman"], nights: 8 } },
      { ip: "1.1.1.7" },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const [lead] = await db.select().from(enquiries).where(eq(enquiries.reference, res.reference));
    expect(lead.kind).toBe("custom");
    expect(lead.details).toEqual({ destinations: ["Kerala", "Andaman"], nights: 8 });
  });

  it("derives a lead source from UTM or referrer", () => {
    expect(deriveSource({ utm_source: "IG" }, undefined)).toBe("instagram");
    expect(deriveSource(undefined, "https://www.google.co.in/search?q=kashmir")).toBe("google");
    expect(deriveSource(undefined, "https://someblog.example/post")).toBe("referral");
    expect(deriveSource(undefined, undefined)).toBe("direct");
  });
});
