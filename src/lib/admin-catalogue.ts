import { and, eq, ne, asc, desc, sql } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@/db";
import { packages, departures, destinations, type PublishStatus } from "@/db/schema";
import type { StaffUser } from "./auth";
import { can, ForbiddenError } from "./permissions";
import { slugify } from "./format";

export class ValidationError extends Error {
  constructor(public fieldErrors: Record<string, string>, message?: string) {
    super(message ?? fieldErrors.form ?? "Please fix the highlighted fields.");
  }
}

const photo = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#DCD6C2"),
  alt: z.string().trim().min(1, "Every photo needs alt text."),
  caption: z.string().trim().optional(),
  url: z.string().trim().url().optional().or(z.literal("").transform(() => undefined)),
});

export const packageInput = z.object({
  title: z.string().trim().min(4, "Give the package a title.").max(120),
  slug: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v ? slugify(v) : undefined)),
  destinationId: z.coerce.number().int().positive("Pick a destination."),
  tripType: z.enum(["honeymoon", "family", "adventure", "pilgrimage", "group"]),
  nights: z.coerce.number().int().min(1, "At least one night.").max(30),
  route: z.string().trim().max(200).default(""),
  summary: z.string().trim().max(160, "Keep the summary under 160 characters.").default(""),
  overview: z.string().trim().max(5000).default(""),
  priceFrom: z.coerce.number().int().min(0, "Price can't be negative.").max(10_000_000),
  priceNote: z.string().trim().max(120).default("Twin sharing, excluding flights."),
  featured: z.coerce.boolean().default(false),
  travelMonths: z.array(z.coerce.number().int().min(1).max(12)).default([]),
  photos: z.array(photo).max(40).default([]),
  itinerary: z
    .array(
      z.object({
        day: z.coerce.number().int().min(1),
        title: z.string().trim().min(1, "Each day needs a title."),
        description: z.string().trim().default(""),
        stay: z.string().trim().optional(),
        meals: z.string().trim().optional(),
      }),
    )
    .max(31)
    .default([]),
  hotels: z
    .array(z.object({ stop: z.string().trim(), name: z.string().trim(), category: z.string().trim(), roomType: z.string().trim() }))
    .default([]),
  inclusions: z.array(z.string().trim().min(1)).default([]),
  exclusions: z.array(z.string().trim().min(1)).default([]),
  faqs: z.array(z.object({ q: z.string().trim().min(1), a: z.string().trim().min(1) })).default([]),
  cancellationPolicy: z.string().trim().max(3000).default(""),
  seoTitle: z.string().trim().max(70, "SEO titles over 70 characters get cut off.").optional().nullable(),
  seoDescription: z.string().trim().max(160, "Keep the meta description under 160 characters.").optional().nullable(),
});
export type PackageInput = z.input<typeof packageInput>;

function zodToFields(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[i.path.join(".")] ??= i.message;
  return out;
}

function assertCan(actor: StaffUser, cap: "catalogue.edit" | "catalogue.publish") {
  if (!can(actor.role, cap)) throw new ForbiddenError(cap);
}

async function uniqueSlug(db: DB, table: typeof packages | typeof destinations, base: string, exceptId?: number) {
  let slug = base || "untitled";
  for (let i = 2; ; i++) {
    const [hit] = await db
      .select({ id: table.id })
      .from(table)
      .where(exceptId ? and(eq(table.slug, slug), ne(table.id, exceptId)) : eq(table.slug, slug));
    if (!hit) return slug;
    slug = `${base}-${i}`;
  }
}

export async function savePackage(db: DB, actor: StaffUser, id: number | null, raw: unknown) {
  assertCan(actor, "catalogue.edit");
  const parsed = packageInput.safeParse(raw);
  if (!parsed.success) throw new ValidationError(zodToFields(parsed.error));
  const v = parsed.data;
  const [dest] = await db.select().from(destinations).where(eq(destinations.id, v.destinationId));
  if (!dest) throw new ValidationError({ destinationId: "Pick a destination." });
  const base = v.slug || slugify(`${dest.slug}-${v.title}`);
  const slug = await uniqueSlug(db, packages, base, id ?? undefined);
  const values = { ...v, slug, itinerary: v.itinerary.map((d, i) => ({ ...d, day: i + 1 })), updatedAt: new Date() };
  if (id) {
    const [existing] = await db.select().from(packages).where(eq(packages.id, id));
    if (!existing) throw new ValidationError({ form: "Package not found." });
    if (existing.status === "published") {
      const problems = publishProblems({ ...existing, ...values });
      if (problems.length) throw new ValidationError({ form: `A published package must stay complete: ${problems[0]}` });
    }
    const [row] = await db.update(packages).set(values).where(eq(packages.id, id)).returning();
    return row;
  }
  const [row] = await db.insert(packages).values({ ...values, status: "draft" }).returning();
  return row;
}

type PkgLike = Pick<
  typeof packages.$inferSelect,
  "title" | "summary" | "priceFrom" | "photos" | "itinerary" | "inclusions" | "nights" | "destinationId"
>;

/** Reasons a package cannot be published. Empty array = ready. */
export function publishProblems(p: PkgLike): string[] {
  const out: string[] = [];
  if (!p.title || p.title.length < 4) out.push("Add a title.");
  if (!p.destinationId) out.push("Pick a destination.");
  if (!p.summary) out.push("Write a short summary.");
  if (!p.priceFrom || p.priceFrom <= 0) out.push("Set a starting price.");
  if (!p.photos.length) out.push("Add at least one photo.");
  if (p.photos.some((ph) => !ph.alt)) out.push("Every photo needs alt text.");
  if (!p.itinerary.length) out.push("Add the day-by-day itinerary.");
  if (!p.inclusions.length) out.push("List what's included.");
  return out;
}

export function completeness(p: typeof packages.$inferSelect, depCount: number) {
  const sections = [
    { key: "basics", label: "Basics", done: Boolean(p.title && p.summary && p.priceFrom > 0) },
    { key: "destination", label: "Destination & type", done: Boolean(p.destinationId && p.tripType) },
    { key: "photos", label: `Photos · ${p.photos.length} added`, done: p.photos.length > 0 },
    { key: "itinerary", label: `Itinerary · ${p.itinerary.length} days`, done: p.itinerary.length > 0 },
    { key: "hotels", label: "Hotels & inclusions", done: p.inclusions.length > 0 },
    { key: "departures", label: `Departures · ${depCount} open`, done: true },
    { key: "faqs", label: `FAQs · ${p.faqs.length} questions`, done: p.faqs.length > 0 },
    { key: "policy", label: "Cancellation policy", done: Boolean(p.cancellationPolicy) },
    { key: "seo", label: "SEO description", done: Boolean(p.seoDescription) },
  ];
  return { sections, done: sections.filter((s) => s.done).length, total: sections.length };
}

export async function setPackageStatus(db: DB, actor: StaffUser, id: number, status: PublishStatus) {
  assertCan(actor, "catalogue.publish");
  const [p] = await db.select().from(packages).where(eq(packages.id, id));
  if (!p) throw new ValidationError({ form: "Package not found." });
  if (status === "published") {
    const problems = publishProblems(p);
    if (problems.length) throw new ValidationError({ form: problems.join(" ") }, "This package isn't ready to publish yet.");
  }
  const [row] = await db
    .update(packages)
    .set({ status, publishedAt: status === "published" ? (p.publishedAt ?? new Date()) : p.publishedAt, updatedAt: new Date() })
    .where(eq(packages.id, id))
    .returning();
  return row;
}

export async function duplicatePackage(db: DB, actor: StaffUser, id: number) {
  assertCan(actor, "catalogue.edit");
  const [p] = await db.select().from(packages).where(eq(packages.id, id));
  if (!p) throw new ValidationError({ form: "Package not found." });
  const { id: _id, slug, publishedAt: _pa, updatedAt: _u, ...rest } = p;
  void _id; void _pa; void _u;
  const [row] = await db
    .insert(packages)
    .values({ ...rest, title: `${p.title} (copy)`, slug: await uniqueSlug(db, packages, `${slug}-copy`), status: "draft", featured: false })
    .returning();
  return row;
}

export async function adminPackageList(db: DB, filter: { status?: string; q?: string } = {}) {
  const rows = await db
    .select({
      p: packages,
      destName: destinations.name,
      deps: sql<number>`(select count(*)::int from ${departures} where ${departures.packageId} = ${packages.id} and ${departures.status} = 'open')`,
      enquiries: sql<number>`(select count(*)::int from enquiries e where e.package_id = ${packages.id})`,
    })
    .from(packages)
    .innerJoin(destinations, eq(destinations.id, packages.destinationId))
    .orderBy(desc(packages.updatedAt));
  return rows.filter(
    (r) =>
      (!filter.status || filter.status === "all" || r.p.status === filter.status) &&
      (!filter.q || `${r.p.title} ${r.destName}`.toLowerCase().includes(filter.q.toLowerCase())),
  );
}

/* ---------- Departures ---------- */

const departureInput = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a start date."),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick an end date."),
    price: z.coerce.number().int().min(1, "Set a price."),
    seatsTotal: z.coerce.number().int().min(1).max(500),
    seatsLeft: z.coerce.number().int().min(0),
  })
  .refine((d) => d.endDate >= d.startDate, { path: ["endDate"], message: "End date must be after the start." })
  .refine((d) => d.seatsLeft <= d.seatsTotal, { path: ["seatsLeft"], message: "Seats left can't exceed total seats." });

export async function saveDeparture(db: DB, actor: StaffUser, packageId: number, depId: number | null, raw: unknown) {
  assertCan(actor, "catalogue.edit");
  const parsed = departureInput.safeParse(raw);
  if (!parsed.success) throw new ValidationError(zodToFields(parsed.error));
  const v = parsed.data;
  const status = v.seatsLeft === 0 ? ("full" as const) : ("open" as const);
  if (depId) {
    const [row] = await db
      .update(departures)
      .set({ ...v, status })
      .where(and(eq(departures.id, depId), eq(departures.packageId, packageId)))
      .returning();
    return row;
  }
  const [row] = await db.insert(departures).values({ ...v, packageId, status }).returning();
  return row;
}

export async function deleteDeparture(db: DB, actor: StaffUser, packageId: number, depId: number) {
  assertCan(actor, "catalogue.edit");
  await db.delete(departures).where(and(eq(departures.id, depId), eq(departures.packageId, packageId)));
}

export async function packageDepartures(db: DB, packageId: number) {
  return db.select().from(departures).where(eq(departures.packageId, packageId)).orderBy(asc(departures.startDate));
}

/* ---------- Destinations ---------- */

export const destinationInput = z.object({
  name: z.string().trim().min(2, "Name the destination.").max(60),
  slug: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v ? slugify(v) : undefined)),
  region: z.string().trim().min(2, "Pick a region."),
  tagline: z.string().trim().max(160).default(""),
  intro: z.string().trim().max(1000).default(""),
  bestMonths: z.string().trim().max(80).default(""),
  hero: photo,
  photos: z.array(photo).default([]),
  highlights: z.array(z.string().trim().min(1)).default([]),
  seasons: z
    .array(z.object({ month: z.coerce.number().int().min(1).max(12), season: z.enum(["peak", "good", "avoid"]), note: z.string().optional() }))
    .default([]),
  thingsToDo: z.array(z.object({ title: z.string().trim().min(1), description: z.string().trim() })).default([]),
  travelInfo: z
    .array(z.object({ label: z.string().trim().min(1), body: z.string().trim(), verifiedOn: z.string().optional() }))
    .default([]),
  relatedSlugs: z.array(z.string()).default([]),
  seoTitle: z.string().trim().max(70).optional().nullable(),
  seoDescription: z.string().trim().max(160).optional().nullable(),
});

export async function saveDestination(db: DB, actor: StaffUser, id: number | null, raw: unknown) {
  assertCan(actor, "catalogue.edit");
  const parsed = destinationInput.safeParse(raw);
  if (!parsed.success) throw new ValidationError(zodToFields(parsed.error));
  const v = parsed.data;
  const slug = await uniqueSlug(db, destinations, v.slug || slugify(v.name), id ?? undefined);
  if (id) {
    const [row] = await db.update(destinations).set({ ...v, slug, updatedAt: new Date() }).where(eq(destinations.id, id)).returning();
    return row;
  }
  const [row] = await db.insert(destinations).values({ ...v, slug, status: "draft" }).returning();
  return row;
}

export async function setDestinationStatus(db: DB, actor: StaffUser, id: number, status: PublishStatus) {
  assertCan(actor, "catalogue.publish");
  const [d] = await db.select().from(destinations).where(eq(destinations.id, id));
  if (!d) throw new ValidationError({ form: "Destination not found." });
  if (status === "published" && (!d.intro || !d.hero?.alt))
    throw new ValidationError({ form: "Add an intro and a hero photo with alt text before publishing." });
  if (status !== "published") {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(packages)
      .where(and(eq(packages.destinationId, id), eq(packages.status, "published")));
    if (n > 0) throw new ValidationError({ form: `Unpublish its ${n} live package(s) first.` });
  }
  const [row] = await db.update(destinations).set({ status, updatedAt: new Date() }).where(eq(destinations.id, id)).returning();
  return row;
}

export async function adminDestinationList(db: DB) {
  return db
    .select({
      d: destinations,
      live: sql<number>`(select count(*)::int from packages p where p.destination_id = ${destinations.id} and p.status = 'published')`,
      total: sql<number>`(select count(*)::int from packages p where p.destination_id = ${destinations.id})`,
    })
    .from(destinations)
    .orderBy(asc(destinations.name));
}
