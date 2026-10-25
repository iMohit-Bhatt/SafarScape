import { and, eq, gte, desc } from "drizzle-orm";
import type { DB } from "@/db";
import { enquiries, leadActivities, packages, destinations, departures, emailLog } from "@/db/schema";
import { enquirySchema, fieldErrors, type FieldErrors } from "./validation";
import { rateLimit } from "./rate-limit";
import { verifyTurnstile } from "./turnstile";
import { getSettings, type Settings } from "./settings";
import { sendLogged } from "./email";
import { fillTemplate, whatsappLink } from "./whatsapp";
import { durationLabel, formatDateRange, formatINR, displayPhone } from "./format";

export type EnquiryResult =
  | { ok: true; reference: string; firstName: string; email?: string; duplicate?: boolean }
  | { ok: false; error: string; fieldErrors?: FieldErrors; status: number };

export type RequestMeta = { ip?: string | null; userAgent?: string | null; siteUrl?: string };

const SOURCES = ["google", "instagram", "facebook", "whatsapp", "referral", "email", "youtube"] as const;

/** Maps UTM / referrer to a lead source shown in the CRM and reports. */
export function deriveSource(utm: Record<string, string> | undefined, referrer: string | undefined): string {
  const src = utm?.utm_source?.toLowerCase();
  if (src) {
    if (src.includes("insta") || src === "ig") return "instagram";
    if (src.includes("face") || src === "fb" || src === "meta") return "facebook";
    if (src.includes("google") || src === "adwords") return "google";
    if (src.includes("whatsapp") || src === "wa") return "whatsapp";
    if ((SOURCES as readonly string[]).includes(src)) return src;
    return src.slice(0, 30);
  }
  if (referrer) {
    try {
      const host = new URL(referrer).hostname;
      if (/google\./.test(host)) return "google";
      if (/instagram\.com$/.test(host)) return "instagram";
      if (/facebook\.com$|fb\.com$/.test(host)) return "facebook";
      if (/whatsapp|wa\.me/.test(host)) return "whatsapp";
      return "referral";
    } catch {
      /* fall through */
    }
  }
  return "direct";
}

function newReference() {
  return `SFS-${Math.floor(10000 + Math.random() * 90000)}`;
}

export async function submitEnquiry(db: DB, raw: unknown, meta: RequestMeta = {}): Promise<EnquiryResult> {
  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) {
    // Honeypot filled → pretend success to the bot, store nothing.
    const fe = fieldErrors(parsed.error);
    if (fe.website) return { ok: true, reference: "SFS-00000", firstName: "there" };
    return { ok: false, status: 422, error: "Please check the highlighted fields.", fieldErrors: fe };
  }
  const data = parsed.data;

  if (!(await verifyTurnstile(data.turnstileToken, meta.ip))) {
    return { ok: false, status: 400, error: "We couldn't verify you're human. Please try again." };
  }

  const ipKey = `enquiry:ip:${meta.ip ?? "unknown"}`;
  const okIp = await rateLimit(db, ipKey, Number(process.env.ENQUIRY_RATE_LIMIT ?? 8), 600);
  const okPhone = await rateLimit(db, `enquiry:phone:${data.phone}`, 5, 3600);
  if (!okIp || !okPhone) {
    return {
      ok: false,
      status: 429,
      error: "You've sent a few enquiries in a short time. Please wait a few minutes, or message us on WhatsApp.",
    };
  }

  let pkg: typeof packages.$inferSelect | undefined;
  let dest: typeof destinations.$inferSelect | undefined;
  if (data.packageSlug) {
    [pkg] = await db
      .select()
      .from(packages)
      .where(and(eq(packages.slug, data.packageSlug), eq(packages.status, "published")));
  }
  if (pkg) {
    [dest] = await db.select().from(destinations).where(eq(destinations.id, pkg.destinationId));
  } else if (data.destinationSlug) {
    [dest] = await db.select().from(destinations).where(eq(destinations.slug, data.destinationSlug));
  }

  let travelMonth = data.travelMonth;
  if (data.departureId && pkg) {
    const [dep] = await db
      .select()
      .from(departures)
      .where(and(eq(departures.id, data.departureId), eq(departures.packageId, pkg.id)));
    if (dep) travelMonth = formatDateRange(dep.startDate, dep.endDate);
  }

  const firstName = data.name.split(/\s+/)[0];

  // Duplicate protection: same phone + same trip within 10 minutes returns the original reference.
  const tenMinAgo = new Date(Date.now() - 10 * 60_000);
  const [dupe] = await db
    .select()
    .from(enquiries)
    .where(
      and(
        eq(enquiries.phone, data.phone),
        gte(enquiries.createdAt, tenMinAgo),
        pkg ? eq(enquiries.packageId, pkg.id) : eq(enquiries.kind, data.kind),
      ),
    )
    .orderBy(desc(enquiries.createdAt))
    .limit(1);
  if (dupe) return { ok: true, reference: dupe.reference, firstName, email: dupe.email ?? undefined, duplicate: true };

  const source = deriveSource(data.utm, data.referrer);
  const values = {
    kind: data.kind,
    name: data.name,
    phone: data.phone,
    email: data.email ?? null,
    travelMonth: travelMonth ?? null,
    adults: data.adults,
    children: data.children,
    departureCity: data.departureCity ?? null,
    budget: data.budget ?? null,
    message: data.message ?? null,
    details: data.details ?? {},
    consent: true,
    packageId: pkg?.id ?? null,
    destinationId: dest?.id ?? null,
    source,
    utm: data.utm ?? {},
    referrer: data.referrer ?? null,
    pageUrl: data.pageUrl ?? null,
  };

  // 1) Save first — the lead must never be lost because email failed.
  let saved: typeof enquiries.$inferSelect | undefined;
  for (let attempt = 0; attempt < 5 && !saved; attempt++) {
    try {
      [saved] = await db.insert(enquiries).values({ ...values, reference: newReference() }).returning();
    } catch (e) {
      if (attempt === 4) throw e;
    }
  }
  if (!saved) throw new Error("Could not save enquiry");

  await db.insert(leadActivities).values({
    enquiryId: saved.id,
    kind: "created",
    body: `Enquiry received via website (${source})`,
  });

  // 2) Then email the team and the traveller.
  const settings = await getSettings(db);
  const emailOk = await sendEnquiryEmails(db, saved, { pkg, dest, settings, siteUrl: meta.siteUrl });
  await db
    .update(enquiries)
    .set({ emailStatus: emailOk ? "sent" : "failed" })
    .where(eq(enquiries.id, saved.id));

  return { ok: true, reference: saved.reference, firstName, email: saved.email ?? undefined };
}

export function recipientsFor(settings: Settings, destinationSlug?: string | null): string[] {
  const base = settings.emailRecipients.filter(Boolean);
  const routed = destinationSlug
    ? settings.routingRules.filter((r) => r.destinationSlugs.includes(destinationSlug)).map((r) => r.to)
    : [];
  const fallback = process.env.ENQUIRY_FALLBACK_EMAIL ? [process.env.ENQUIRY_FALLBACK_EMAIL] : [];
  const all = [...new Set([...routed, ...base])];
  return all.length ? all : fallback;
}

async function sendEnquiryEmails(
  db: DB,
  e: typeof enquiries.$inferSelect,
  ctx: {
    pkg?: typeof packages.$inferSelect;
    dest?: typeof destinations.$inferSelect;
    settings: Settings;
    siteUrl?: string;
  },
): Promise<boolean> {
  const { pkg, dest, settings } = ctx;
  const site = ctx.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const tripName = pkg ? pkg.title : dest ? `${dest.name} (destination enquiry)` : e.kind === "custom" ? "Custom trip" : "General enquiry";
  const wa = whatsappLink(e.phone, `Hi ${e.name.split(" ")[0]}, this is Safarscape about your enquiry ${e.reference}.`);

  const lines = [
    `New ${e.kind} enquiry ${e.reference}`,
    "",
    `Name: ${e.name}`,
    `Phone: ${displayPhone(e.phone)}`,
    `Email: ${e.email ?? "—"}`,
    `Trip: ${tripName}${pkg ? ` · ${durationLabel(pkg.nights)} · from ${formatINR(pkg.priceFrom)}` : ""}`,
    `Travel: ${e.travelMonth ?? "—"}`,
    `Travellers: ${e.adults} adults${e.children ? `, ${e.children} children` : ""}`,
    `From: ${e.departureCity ?? "—"}`,
    `Budget: ${e.budget ?? "—"}`,
    `Message: ${e.message ?? "—"}`,
    ...Object.entries(e.details ?? {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`),
    "",
    `Source: ${e.source}${Object.keys(e.utm).length ? ` (${Object.entries(e.utm).map(([k, v]) => `${k}=${v}`).join(", ")})` : ""}`,
    `Page: ${e.pageUrl ?? "—"}`,
    "",
    `Open in admin: ${site}/admin/leads/${e.id}`,
    wa ? `WhatsApp: ${wa}` : "",
  ];
  const recipients = recipientsFor(settings, dest?.slug);
  let allOk = recipients.length > 0;
  if (!recipients.length) console.error(`[enquiry] ${e.reference}: no team recipients configured`);
  for (const to of recipients) {
    const r = await sendLogged(
      db,
      {
        to,
        subject: `New enquiry ${e.reference} · ${tripName} · ${e.name}`,
        text: lines.filter((l) => l !== undefined).join("\n"),
        replyTo: e.email ?? undefined,
      },
      { kind: "team", enquiryId: e.id },
    );
    allOk &&= r.ok;
  }

  if (e.email && settings.autoReply.enabled) {
    const vars = {
      traveller_name: e.name.split(" ")[0],
      package_name: tripName,
      reference: e.reference,
      callback_window: "within one working day",
      agency_phone: settings.agency.phone || "",
    };
    const r = await sendLogged(
      db,
      {
        to: e.email,
        subject: fillTemplate(settings.autoReply.subject, vars),
        text: fillTemplate(settings.autoReply.body, vars),
      },
      { kind: "autoreply", enquiryId: e.id },
    );
    await db.insert(leadActivities).values({
      enquiryId: e.id,
      kind: r.ok ? "email" : "email_failed",
      body: r.ok ? `Auto-reply sent to ${e.email}` : `Auto-reply to ${e.email} failed`,
    });
  }
  if (!allOk) {
    await db.insert(leadActivities).values({
      enquiryId: e.id,
      kind: "email_failed",
      body: "Team notification email failed — retry from the lead page.",
    });
  }
  return allOk;
}

/** Re-sends the team notification for an enquiry whose email failed. */
export async function retryEnquiryEmail(db: DB, enquiryId: number): Promise<boolean> {
  const [e] = await db.select().from(enquiries).where(eq(enquiries.id, enquiryId));
  if (!e) return false;
  const pkg = e.packageId ? (await db.select().from(packages).where(eq(packages.id, e.packageId)))[0] : undefined;
  const dest = e.destinationId
    ? (await db.select().from(destinations).where(eq(destinations.id, e.destinationId)))[0]
    : undefined;
  const settings = await getSettings(db);
  // Don't send a second auto-reply to the traveller on retry.
  const ok = await sendEnquiryEmails(db, e, {
    pkg,
    dest,
    settings: { ...settings, autoReply: { ...settings.autoReply, enabled: false } },
  });
  await db.update(enquiries).set({ emailStatus: ok ? "sent" : "failed" }).where(eq(enquiries.id, e.id));
  await db.insert(leadActivities).values({
    enquiryId: e.id,
    kind: ok ? "email" : "email_failed",
    body: ok ? "Team notification re-sent" : "Retry failed — check email settings",
  });
  return ok;
}

export async function emailsForEnquiry(db: DB, enquiryId: number) {
  return db.select().from(emailLog).where(eq(emailLog.enquiryId, enquiryId)).orderBy(desc(emailLog.createdAt));
}
