import { and, asc, desc, eq, inArray, lte, gte, or, isNull, sql } from "drizzle-orm";
import type { DB } from "@/db";
import {
  packages,
  destinations,
  departures,
  offers,
  posts,
  testimonials,
  galleryImages,
  banners,
  type TripType,
} from "@/db/schema";

export type Pkg = typeof packages.$inferSelect;
export type Dest = typeof destinations.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type PkgCard = Pkg & { destination: Dest; offer: Offer | null; finalPrice: number };

export const tripTypes: { value: TripType; label: string; blurb: string }[] = [
  { value: "honeymoon", label: "Honeymoon", blurb: "Private stays, slower days, one splurge night" },
  { value: "family", label: "Family holidays", blurb: "Short drives, kid-friendly hotels, rest days" },
  { value: "adventure", label: "Adventure", blurb: "Treks, rafting and high passes with local guides" },
  { value: "pilgrimage", label: "Pilgrimage", blurb: "Darshan timings, porters and ponies arranged" },
  { value: "group", label: "Group tours", blurb: "Fixed departures, a trip lead, friends by day two" },
];
export const tripTypeShort: Record<TripType, string> = {
  honeymoon: "Honeymoon",
  family: "Family",
  adventure: "Adventure",
  pilgrimage: "Pilgrimage",
  group: "Group",
};

const today = () => new Date().toISOString().slice(0, 10);

export async function activeOffers(db: DB): Promise<Offer[]> {
  const t = today();
  return db
    .select()
    .from(offers)
    .where(and(eq(offers.active, true), lte(offers.validFrom, t), gte(offers.validTo, t)));
}

export function applyOffer(pkg: Pkg, list: Offer[]): { offer: Offer | null; finalPrice: number } {
  const offer = list.find((o) => o.packageIds.includes(pkg.id)) ?? null;
  if (!offer) return { offer: null, finalPrice: pkg.priceFrom };
  const off = offer.discountType === "percent" ? Math.round((pkg.priceFrom * offer.amount) / 100) : offer.amount;
  return { offer, finalPrice: Math.max(0, pkg.priceFrom - off) };
}

export async function publishedPackages(db: DB): Promise<PkgCard[]> {
  const rows = await db
    .select({ p: packages, d: destinations })
    .from(packages)
    .innerJoin(destinations, eq(destinations.id, packages.destinationId))
    .where(eq(packages.status, "published"));
  const offs = await activeOffers(db);
  return rows.map(({ p, d }) => ({ ...p, destination: d, ...applyOffer(p, offs) }));
}

export type ListingFilters = {
  q?: string;
  dest?: string[];
  type?: string[];
  min?: number;
  max?: number;
  dur?: "short" | "mid" | "long";
  months?: number[];
  sort?: "popular" | "price-asc" | "price-desc" | "duration";
  page?: number;
};

export const PAGE_SIZE = 9;

const asArray = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? v.split(",") : []).map((s) => s.trim()).filter(Boolean);

export function parseFilters(sp: Record<string, string | string[] | undefined>): ListingFilters {
  const num = (v: string | string[] | undefined) => {
    const n = Number(Array.isArray(v) ? v[0] : v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const sort = one(sp.sort);
  const dur = one(sp.dur);
  const budget = one(sp.budget)?.match(/^(\d+)-(\d+)?$/);
  return {
    q: one(sp.q)?.slice(0, 80) || undefined,
    dest: asArray(sp.dest),
    type: asArray(sp.type),
    min: num(sp.min) ?? (budget ? Number(budget[1]) || undefined : undefined),
    max: num(sp.max) ?? (budget?.[2] ? Number(budget[2]) : undefined),
    dur: dur === "short" || dur === "mid" || dur === "long" ? dur : undefined,
    months: asArray(sp.month).map(Number).filter((m) => m >= 1 && m <= 12),
    sort: sort === "price-asc" || sort === "price-desc" || sort === "duration" ? sort : "popular",
    page: Math.max(1, num(sp.page) ?? 1),
  };
}

export function filterPackages(all: PkgCard[], f: ListingFilters) {
  const q = f.q?.toLowerCase();
  let list = all.filter((p) => {
    if (q) {
      const hay = `${p.title} ${p.destination.name} ${p.destination.region} ${p.route} ${p.summary} ${p.tripType}`.toLowerCase();
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    if (f.dest?.length && !f.dest.includes(p.destination.slug)) return false;
    if (f.type?.length && !f.type.includes(p.tripType)) return false;
    if (f.min && p.finalPrice < f.min) return false;
    if (f.max && p.finalPrice > f.max) return false;
    if (f.dur === "short" && p.nights > 4) return false;
    if (f.dur === "mid" && (p.nights < 5 || p.nights > 7)) return false;
    if (f.dur === "long" && p.nights < 8) return false;
    if (f.months?.length && !f.months.some((m) => p.travelMonths.includes(m))) return false;
    return true;
  });
  list = [...list].sort((a, b) => {
    switch (f.sort) {
      case "price-asc":
        return a.finalPrice - b.finalPrice;
      case "price-desc":
        return b.finalPrice - a.finalPrice;
      case "duration":
        return a.nights - b.nights;
      default:
        return b.popularity - a.popularity || a.id - b.id;
    }
  });
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(f.page ?? 1, pages);
  return { total, pages, page, items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) };
}

export async function packageBySlug(db: DB, slug: string, { includeDrafts = false } = {}) {
  const [row] = await db
    .select({ p: packages, d: destinations })
    .from(packages)
    .innerJoin(destinations, eq(destinations.id, packages.destinationId))
    .where(includeDrafts ? eq(packages.slug, slug) : and(eq(packages.slug, slug), eq(packages.status, "published")));
  if (!row) return null;
  const deps = await db
    .select()
    .from(departures)
    .where(and(eq(departures.packageId, row.p.id), gte(departures.startDate, today())))
    .orderBy(asc(departures.startDate));
  const offs = await activeOffers(db);
  return { ...row.p, destination: row.d, departures: deps, ...applyOffer(row.p, offs) };
}

export async function publishedDestinations(db: DB) {
  const rows = await db
    .select()
    .from(destinations)
    .where(eq(destinations.status, "published"))
    .orderBy(asc(destinations.name));
  const counts = await db
    .select({ id: packages.destinationId, n: sql<number>`count(*)::int`, min: sql<number>`min(${packages.priceFrom})::int` })
    .from(packages)
    .where(eq(packages.status, "published"))
    .groupBy(packages.destinationId);
  const byId = new Map(counts.map((c) => [c.id, c]));
  return rows.map((d) => ({ ...d, packageCount: byId.get(d.id)?.n ?? 0, priceFrom: byId.get(d.id)?.min ?? null }));
}

export async function destinationBySlug(db: DB, slug: string) {
  const [d] = await db
    .select()
    .from(destinations)
    .where(and(eq(destinations.slug, slug), eq(destinations.status, "published")));
  if (!d) return null;
  const all = await publishedPackages(db);
  const pkgs = all.filter((p) => p.destinationId === d.id).sort((a, b) => b.popularity - a.popularity);
  const related = d.relatedSlugs.length
    ? await db
        .select()
        .from(destinations)
        .where(and(inArray(destinations.slug, d.relatedSlugs), eq(destinations.status, "published")))
    : [];
  return { ...d, packages: pkgs, related };
}

export async function publishedPosts(db: DB, category?: string) {
  const now = new Date();
  const visible = or(
    eq(posts.status, "published"),
    and(eq(posts.status, "scheduled"), lte(posts.publishAt, now)),
  );
  return db
    .select()
    .from(posts)
    .where(category ? and(visible, eq(posts.category, category)) : visible)
    .orderBy(desc(posts.publishAt));
}

export async function postBySlug(db: DB, slug: string) {
  const list = await publishedPosts(db);
  return list.find((p) => p.slug === slug) ?? null;
}

export async function approvedTestimonials(db: DB, homeOnly = false) {
  return db
    .select()
    .from(testimonials)
    .where(
      homeOnly
        ? and(eq(testimonials.status, "approved"), eq(testimonials.consent, true), eq(testimonials.showOnHome, true))
        : and(eq(testimonials.status, "approved"), eq(testimonials.consent, true)),
    )
    .orderBy(desc(testimonials.createdAt));
}

export async function visibleGallery(db: DB) {
  return db
    .select()
    .from(galleryImages)
    .where(and(eq(galleryImages.visible, true), eq(galleryImages.peopleConsent, true)))
    .orderBy(asc(galleryImages.sortOrder));
}

export async function liveBanner(db: DB) {
  const t = today();
  const list = await db
    .select()
    .from(banners)
    .where(
      and(
        or(eq(banners.status, "live"), eq(banners.status, "scheduled")),
        or(isNull(banners.startsAt), lte(banners.startsAt, t)),
        or(isNull(banners.endsAt), gte(banners.endsAt, t)),
      ),
    )
    .orderBy(desc(banners.priority));
  return list[0] ?? null;
}
