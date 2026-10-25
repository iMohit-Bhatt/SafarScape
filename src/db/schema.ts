import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  serial,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/* ---------- Shared JSON shapes ---------- */

export type Role = "owner" | "manager" | "sales";
export type LeadStatus = "new" | "contacted" | "quoted" | "converted" | "lost";
export type PublishStatus = "draft" | "published" | "unpublished" | "archived";
export type TripType = "honeymoon" | "family" | "adventure" | "pilgrimage" | "group";
export type Season = "peak" | "good" | "avoid";

export type Photo = { color: string; caption?: string; alt: string; url?: string };
export type ItineraryDay = {
  day: number;
  title: string;
  description: string;
  stay?: string;
  meals?: string;
};
export type Hotel = { stop: string; name: string; category: string; roomType: string };
export type Faq = { q: string; a: string };
export type ThingToDo = { title: string; description: string };
export type TravelInfo = { label: string; body: string; verifiedOn?: string };
export type SeasonMonth = { month: number; season: Season; note?: string };

/* ---------- Staff & auth ---------- */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").$type<Role>().notNull().default("sales"),
    status: text("status").$type<"active" | "invited" | "deactivated">().notNull().default("active"),
    phone: text("phone"),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256 of the cookie token
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResets = pgTable("password_resets", {
  id: text("id").primaryKey(), // sha256 of the token
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export const loginAttempts = pgTable("login_attempts", {
  email: text("email").primaryKey(),
  failures: integer("failures").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
});

/* ---------- Catalogue ---------- */

export const destinations = pgTable(
  "destinations",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    region: text("region").notNull(),
    tagline: text("tagline").notNull().default(""),
    intro: text("intro").notNull().default(""),
    highlights: jsonb("highlights").$type<string[]>().notNull().default([]),
    seasons: jsonb("seasons").$type<SeasonMonth[]>().notNull().default([]),
    thingsToDo: jsonb("things_to_do").$type<ThingToDo[]>().notNull().default([]),
    travelInfo: jsonb("travel_info").$type<TravelInfo[]>().notNull().default([]),
    hero: jsonb("hero").$type<Photo>().notNull(),
    photos: jsonb("photos").$type<Photo[]>().notNull().default([]),
    relatedSlugs: jsonb("related_slugs").$type<string[]>().notNull().default([]),
    bestMonths: text("best_months").notNull().default(""),
    status: text("status").$type<PublishStatus>().notNull().default("draft"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("destinations_slug_idx").on(t.slug)],
);

export const packages = pgTable(
  "packages",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    destinationId: integer("destination_id")
      .notNull()
      .references(() => destinations.id),
    tripType: text("trip_type").$type<TripType>().notNull(),
    nights: integer("nights").notNull(),
    route: text("route").notNull().default(""),
    summary: text("summary").notNull().default(""),
    overview: text("overview").notNull().default(""),
    priceFrom: integer("price_from").notNull(), // INR per person
    priceNote: text("price_note").notNull().default("Twin sharing, excluding flights."),
    featured: boolean("featured").notNull().default(false),
    popularity: integer("popularity").notNull().default(0),
    travelMonths: jsonb("travel_months").$type<number[]>().notNull().default([]),
    photos: jsonb("photos").$type<Photo[]>().notNull().default([]),
    itinerary: jsonb("itinerary").$type<ItineraryDay[]>().notNull().default([]),
    hotels: jsonb("hotels").$type<Hotel[]>().notNull().default([]),
    inclusions: jsonb("inclusions").$type<string[]>().notNull().default([]),
    exclusions: jsonb("exclusions").$type<string[]>().notNull().default([]),
    faqs: jsonb("faqs").$type<Faq[]>().notNull().default([]),
    cancellationPolicy: text("cancellation_policy").notNull().default(""),
    status: text("status").$type<PublishStatus>().notNull().default("draft"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("packages_slug_idx").on(t.slug), index("packages_status_idx").on(t.status)],
);

export const departures = pgTable("departures", {
  id: serial("id").primaryKey(),
  packageId: integer("package_id")
    .notNull()
    .references(() => packages.id, { onDelete: "cascade" }),
  startDate: text("start_date").notNull(), // ISO date
  endDate: text("end_date").notNull(),
  price: integer("price").notNull(),
  seatsTotal: integer("seats_total").notNull(),
  seatsLeft: integer("seats_left").notNull(),
  status: text("status").$type<"open" | "full" | "closed">().notNull().default("open"),
});

export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  badge: text("badge").notNull(), // e.g. "₹4,000 OFF"
  discountType: text("discount_type").$type<"flat" | "percent">().notNull().default("flat"),
  amount: integer("amount").notNull(),
  packageIds: jsonb("package_ids").$type<number[]>().notNull().default([]),
  terms: text("terms").notNull().default(""),
  validFrom: text("valid_from").notNull(),
  validTo: text("valid_to").notNull(),
  active: boolean("active").notNull().default(true),
});

/* ---------- Leads ---------- */

export const enquiries = pgTable(
  "enquiries",
  {
    id: serial("id").primaryKey(),
    reference: text("reference").notNull(),
    kind: text("kind").$type<"package" | "destination" | "custom" | "contact">().notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    travelMonth: text("travel_month"),
    adults: integer("adults").notNull().default(2),
    children: integer("children").notNull().default(0),
    departureCity: text("departure_city"),
    budget: text("budget"),
    message: text("message"),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    consent: boolean("consent").notNull(),
    packageId: integer("package_id").references(() => packages.id),
    destinationId: integer("destination_id").references(() => destinations.id),
    status: text("status").$type<LeadStatus>().notNull().default("new"),
    lostReason: text("lost_reason"),
    quotedAmount: integer("quoted_amount"),
    assigneeId: integer("assignee_id").references(() => users.id),
    followUpAt: timestamp("follow_up_at", { withTimezone: true }),
    source: text("source").notNull().default("direct"),
    utm: jsonb("utm").$type<Record<string, string>>().notNull().default({}),
    referrer: text("referrer"),
    pageUrl: text("page_url"),
    emailStatus: text("email_status").$type<"pending" | "sent" | "failed">().notNull().default("pending"),
    firstContactAt: timestamp("first_contact_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("enquiries_reference_idx").on(t.reference),
    index("enquiries_status_idx").on(t.status),
    index("enquiries_phone_idx").on(t.phone),
  ],
);

export const leadActivities = pgTable("lead_activities", {
  id: serial("id").primaryKey(),
  enquiryId: integer("enquiry_id")
    .notNull()
    .references(() => enquiries.id, { onDelete: "cascade" }),
  actorId: integer("actor_id").references(() => users.id),
  kind: text("kind").notNull(),
  body: text("body").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emailLog = pgTable("email_log", {
  id: serial("id").primaryKey(),
  enquiryId: integer("enquiry_id").references(() => enquiries.id, { onDelete: "set null" }),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  kind: text("kind").$type<"team" | "autoreply" | "reset" | "test">().notNull(),
  provider: text("provider").notNull(),
  status: text("status").$type<"sent" | "failed">().notNull(),
  error: text("error"),
  attempts: integer("attempts").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});

/* ---------- Content ---------- */

export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    body: text("body").notNull().default(""), // blocks separated by blank lines; "## " for headings
    author: text("author").notNull().default("Safarscape team"),
    readMinutes: integer("read_minutes").notNull().default(5),
    hero: jsonb("hero").$type<Photo>().notNull(),
    status: text("status").$type<PublishStatus | "scheduled">().notNull().default("draft"),
    publishAt: timestamp("publish_at", { withTimezone: true }),
    featured: boolean("featured").notNull().default(false),
    relatedPackageIds: jsonb("related_package_ids").$type<number[]>().notNull().default([]),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("posts_slug_idx").on(t.slug)],
);

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  trip: text("trip").notNull(),
  quote: text("quote").notNull(),
  rating: integer("rating").notNull().default(5),
  source: text("source").$type<"google" | "traveller" | "editorial">().notNull(),
  consent: boolean("consent").notNull().default(false),
  verified: boolean("verified").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(true),
  status: text("status").$type<"pending" | "approved" | "rejected">().notNull().default("pending"),
  showOnHome: boolean("show_on_home").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const galleryImages = pgTable("gallery_images", {
  id: serial("id").primaryKey(),
  caption: text("caption").notNull(),
  alt: text("alt").notNull(),
  color: text("color").notNull(),
  url: text("url"),
  destinationSlug: text("destination_slug"),
  credit: text("credit"),
  peopleConsent: boolean("people_consent").notNull().default(true),
  visible: boolean("visible").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  eyebrow: text("eyebrow").notNull().default(""),
  headline: text("headline").notNull(),
  subline: text("subline").notNull().default(""),
  ctaLabel: text("cta_label").notNull(),
  ctaHref: text("cta_href").notNull(),
  startsAt: text("starts_at"),
  endsAt: text("ends_at"),
  priority: integer("priority").notNull().default(0),
  status: text("status").$type<"live" | "scheduled" | "draft">().notNull().default("draft"),
});

/* ---------- Settings ---------- */

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
