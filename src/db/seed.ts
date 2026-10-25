import bcrypt from "bcryptjs";
import { count } from "drizzle-orm";
import type { DB } from "./index";
import * as s from "./schema";
import {
  seedDestinations,
  seedPackages,
  seedOffer,
  seedPosts,
  seedTestimonials,
  seedGallery,
  defaultSettings,
} from "./seed-data";

/** Demo staff. Passwords are for local/demo use only — change them before launch. */
export const DEMO_PASSWORD = "Safarscape#2026";
export const demoStaff = [
  { name: "Rohan T.", email: "owner@safarscape.test", role: "owner" as const },
  { name: "Priya S.", email: "priya@safarscape.test", role: "manager" as const },
  { name: "Arjun M.", email: "arjun@safarscape.test", role: "sales" as const },
  { name: "Neha K.", email: "neha@safarscape.test", role: "sales" as const },
];

const daysAgo = (d: number, h = 10) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(h, 15, 0, 0);
  return t;
};

export async function seedIfEmpty(db: DB, opts: { leads?: boolean } = {}) {
  const [{ n }] = await db.select({ n: count() }).from(s.users);
  if (n > 0) return false;
  await seed(db, opts);
  return true;
}

export async function seed(db: DB, { leads = process.env.SEED_DEMO_LEADS !== "false" }: { leads?: boolean } = {}) {
  const url = process.env.DATABASE_URL ?? "";
  const realDb = url.startsWith("postgres://") || url.startsWith("postgresql://");
  const chosen = process.env.SEED_ADMIN_PASSWORD;
  if (realDb && process.env.SEED_ALLOW_DEMO_PASSWORD !== "true" && (!chosen || chosen.length < 10 || chosen === DEMO_PASSWORD)) {
    // Never create staff accounts with the publicly documented demo password on a real database.
    throw new Error(
      "SEED_ADMIN_PASSWORD must be set (10+ characters, not the demo password) before the first start on a real Postgres database.",
    );
  }
  const hash = await bcrypt.hash(chosen || DEMO_PASSWORD, 10);
  const staff = await db
    .insert(s.users)
    .values(demoStaff.map((u) => ({ ...u, passwordHash: hash, status: "active" as const })))
    .returning();
  const byEmail = Object.fromEntries(staff.map((u) => [u.email, u]));

  const dests = await db
    .insert(s.destinations)
    .values(
      seedDestinations.map((d) => ({
        ...d,
        status: "published" as const,
        seoTitle: `${d.name} tours & packages`,
        seoDescription: d.tagline,
      })),
    )
    .returning();
  const destBySlug = Object.fromEntries(dests.map((d) => [d.slug, d]));

  const now = new Date();
  const pkgs = await db
    .insert(s.packages)
    .values(
      seedPackages.map((p) => ({
        slug: p.slug,
        title: p.title,
        destinationId: destBySlug[p.destination].id,
        tripType: p.tripType,
        nights: p.nights,
        route: p.route,
        summary: p.summary,
        overview: p.overview,
        priceFrom: p.priceFrom,
        featured: p.featured ?? false,
        popularity: p.popularity,
        travelMonths: p.travelMonths,
        photos: p.photos,
        itinerary: p.itinerary,
        hotels: p.hotels,
        inclusions: p.inclusions,
        exclusions: p.exclusions,
        faqs: p.faqs,
        cancellationPolicy:
          "Full refund up to 30 days before departure, 50% up to 15 days, no refund after. The full policy is shared with your quote.",
        status: "published" as const,
        seoTitle: `${p.title} — ${p.nights}N/${p.nights + 1}D ${destBySlug[p.destination].name} package`,
        seoDescription: p.summary,
        publishedAt: now,
      })),
    )
    .returning();
  const pkgBySlug = Object.fromEntries(pkgs.map((p) => [p.slug, p]));

  // One draft so the admin has something to publish.
  await db.insert(s.packages).values({
    slug: "kashmir-autumn-chinar-5n",
    title: "Autumn chinars in Srinagar",
    destinationId: destBySlug.kashmir.id,
    tripType: "family",
    nights: 5,
    route: "Srinagar → Pahalgam",
    summary: "October colours, quiet gardens and a houseboat night.",
    overview: "Draft package — complete the itinerary before publishing.",
    priceFrom: 29900,
    photos: [{ color: "#EBCFA8", alt: "Chinar leaves in October", caption: "Chinars in October" }],
    itinerary: [{ day: 1, title: "Arrive Srinagar", description: "Houseboat check-in." }],
    status: "draft",
  });

  const deps = seedPackages.flatMap((p) =>
    p.departures.map((d) => ({
      packageId: pkgBySlug[p.slug].id,
      startDate: d.start,
      endDate: d.end,
      price: d.price,
      seatsTotal: d.seatsTotal,
      seatsLeft: d.seatsLeft,
      status: (d.seatsLeft === 0 ? "full" : "open") as "full" | "open",
    })),
  );
  if (deps.length) await db.insert(s.departures).values(deps);

  await db.insert(s.offers).values({ ...seedOffer, packageIds: [pkgBySlug["kashmir-5n6d"].id] });

  await db.insert(s.posts).values(
    seedPosts.map((p, i) => ({
      ...p,
      status: "published" as const,
      publishAt: daysAgo(i * 9 + 3),
      relatedPackageIds: p.slug.includes("kashmir") ? [pkgBySlug["kashmir-5n6d"].id] : [],
    })),
  );

  await db.insert(s.testimonials).values(
    seedTestimonials.map((t, i) => ({
      ...t,
      consent: true,
      isDemo: true,
      status: "approved" as const,
      showOnHome: i < 2,
    })),
  );
  await db.insert(s.testimonials).values({
    name: "Sample traveller C.",
    trip: "Goa · Family",
    quote: "Sample review — demo content awaiting moderation.",
    rating: 4,
    source: "traveller",
    consent: true,
    isDemo: true,
    status: "pending",
  });

  await db.insert(s.galleryImages).values(
    seedGallery.map((g, i) => ({
      caption: g.caption,
      alt: g.caption,
      color: g.color,
      destinationSlug: g.dest,
      credit: "Placeholder",
      sortOrder: i,
    })),
  );

  await db.insert(s.banners).values([
    {
      eyebrow: "Early-bird Kashmir",
      headline: "₹4,000 off couples booking before 30 Nov",
      subline: "On Gulmarg snow, Dal Lake mornings.",
      ctaLabel: "See the trip",
      ctaHref: "/packages/kashmir-5n6d",
      status: "live",
      priority: 1,
    },
    {
      eyebrow: "Char Dham 2027",
      headline: "May departures are open",
      subline: "Registration handled for you.",
      ctaLabel: "View yatra",
      ctaHref: "/packages/char-dham-yatra-9n",
      status: "scheduled",
      startsAt: "2027-01-15",
    },
  ]);

  await db.insert(s.settings).values(
    Object.entries(defaultSettings).map(([key, value]) => ({ key, value })),
  );

  if (!leads) return;

  const kashmir = pkgBySlug["kashmir-5n6d"];
  const kerala = pkgBySlug["kerala-tea-hills-backwaters-6n"];
  const charDham = pkgBySlug["char-dham-yatra-9n"];
  const sample = [
    { name: "Demo lead · Ananya R.", phone: "+919800000001", pkg: kashmir, status: "new", source: "google", d: 0, assignee: null },
    { name: "Demo lead · Vikram P.", phone: "+919800000002", pkg: kerala, status: "new", source: "instagram", d: 0, assignee: "arjun@safarscape.test" },
    { name: "Demo lead · Meera J.", phone: "+919800000003", pkg: kashmir, status: "contacted", source: "direct", d: 1, assignee: "neha@safarscape.test" },
    { name: "Demo lead · Kabir S.", phone: "+919800000004", pkg: charDham, status: "quoted", source: "google", d: 3, assignee: "arjun@safarscape.test", quoted: 82000 },
    { name: "Demo lead · Fatima Z.", phone: "+919800000005", pkg: kerala, status: "converted", source: "referral", d: 6, assignee: "priya@safarscape.test", quoted: 59000 },
    { name: "Demo lead · Rahul D.", phone: "+919800000006", pkg: kashmir, status: "lost", source: "facebook", d: 9, assignee: "neha@safarscape.test", lost: "Price too high" },
    { name: "Demo lead · Sana K.", phone: "+919800000007", pkg: null, status: "new", source: "whatsapp", d: 2, assignee: null, kind: "custom" },
  ] as const;

  let refN = 24810;
  for (const l of sample) {
    const created = daysAgo(l.d, 9 + (refN % 8));
    const [e] = await db
      .insert(s.enquiries)
      .values({
        reference: `SFS-${refN++}`,
        kind: "kind" in l ? l.kind : "package",
        name: l.name,
        phone: l.phone,
        email: `${l.name.split("·")[1].trim().split(" ")[0].toLowerCase()}@example.com`,
        travelMonth: "Jan 2027",
        adults: 2,
        consent: true,
        packageId: l.pkg?.id ?? null,
        destinationId: l.pkg?.destinationId ?? destBySlug.kashmir.id,
        status: l.status,
        source: l.source,
        assigneeId: l.assignee ? byEmail[l.assignee].id : null,
        quotedAmount: "quoted" in l ? l.quoted : null,
        lostReason: "lost" in l ? l.lost : null,
        emailStatus: "sent",
        firstContactAt: l.status === "new" ? null : new Date(created.getTime() + 2 * 3600_000),
        followUpAt: l.status === "contacted" || l.status === "quoted" ? daysAgo(-1, 11) : null,
        message: "Demo enquiry generated by the seed script.",
        createdAt: created,
        updatedAt: created,
      })
      .returning();
    await db.insert(s.leadActivities).values({
      enquiryId: e.id,
      kind: "created",
      body: `Enquiry received from ${l.source}`,
      createdAt: created,
    });
  }
}
