import { eq, desc, asc } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@/db";
import { posts, testimonials, galleryImages, banners, offers } from "@/db/schema";
import type { StaffUser } from "./auth";
import { can, ForbiddenError, type Capability } from "./permissions";
import { slugify } from "./format";
import { ValidationError } from "./admin-catalogue";

function assertCan(actor: StaffUser, cap: Capability) {
  if (!can(actor.role, cap)) throw new ForbiddenError(cap);
}
function parse<T extends z.ZodType>(schema: T, raw: unknown): z.output<T> {
  const r = schema.safeParse(raw);
  if (!r.success) {
    const out: Record<string, string> = {};
    for (const i of r.error.issues) out[i.path.join(".")] ??= i.message;
    throw new ValidationError(out);
  }
  return r.data;
}

/* Blog */
export const postInput = z.object({
  title: z.string().trim().min(4, "Add a title.").max(140),
  slug: z.string().trim().max(100).optional(),
  category: z.string().trim().min(2, "Pick a category."),
  excerpt: z.string().trim().max(240).default(""),
  body: z.string().trim().default(""),
  author: z.string().trim().default("Safarscape team"),
  readMinutes: z.coerce.number().int().min(1).max(60).default(5),
  heroColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#DCD6C2"),
  heroAlt: z.string().trim().min(1, "Hero image needs alt text.").default("Article illustration"),
  status: z.enum(["draft", "published", "scheduled", "archived"]).default("draft"),
  publishAt: z.string().optional(),
  featured: z.coerce.boolean().default(false),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(160).optional(),
});

export async function savePost(db: DB, actor: StaffUser, id: number | null, raw: unknown) {
  assertCan(actor, "content.edit");
  const v = parse(postInput, raw);
  if (v.status === "published" && v.body.length < 50) throw new ValidationError({ body: "Write the article before publishing." });
  let publishAt: Date | null = v.publishAt ? new Date(v.publishAt) : null;
  if (v.status === "scheduled" && (!publishAt || Number.isNaN(publishAt.getTime()) || publishAt < new Date()))
    throw new ValidationError({ publishAt: "Pick a future date and time to schedule." });
  if (v.status === "published" && !publishAt) publishAt = new Date();
  const values = {
    title: v.title,
    slug: slugify(v.slug || v.title),
    category: v.category,
    excerpt: v.excerpt,
    body: v.body,
    author: v.author,
    readMinutes: v.readMinutes,
    hero: { color: v.heroColor, alt: v.heroAlt },
    status: v.status,
    publishAt,
    featured: v.featured,
    seoTitle: v.seoTitle || null,
    seoDescription: v.seoDescription || null,
    updatedAt: new Date(),
  };
  if (id) return (await db.update(posts).set(values).where(eq(posts.id, id)).returning())[0];
  return (await db.insert(posts).values(values).returning())[0];
}
export const listPosts = (db: DB) => db.select().from(posts).orderBy(desc(posts.updatedAt));

/* Testimonials — only approved, consented reviews are ever shown publicly. */
export const testimonialInput = z.object({
  name: z.string().trim().min(2),
  trip: z.string().trim().min(2),
  quote: z.string().trim().min(10, "Paste the traveller's words."),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  source: z.enum(["google", "traveller", "editorial"]),
  consent: z.coerce.boolean().default(false),
  verified: z.coerce.boolean().default(false),
});
export async function saveTestimonial(db: DB, actor: StaffUser, id: number | null, raw: unknown) {
  assertCan(actor, "content.edit");
  const v = parse(testimonialInput, raw);
  if (id) return (await db.update(testimonials).set(v).where(eq(testimonials.id, id)).returning())[0];
  return (await db.insert(testimonials).values({ ...v, isDemo: false, status: "pending" }).returning())[0];
}
export async function moderateTestimonial(
  db: DB,
  actor: StaffUser,
  id: number,
  action: "approve" | "reject" | "home-on" | "home-off",
) {
  assertCan(actor, "testimonials.approve");
  const [t] = await db.select().from(testimonials).where(eq(testimonials.id, id));
  if (!t) throw new ValidationError({ form: "Not found." });
  if (action === "approve" && !t.consent) throw new ValidationError({ form: "Record the traveller's consent before approving." });
  const set =
    action === "approve"
      ? { status: "approved" as const }
      : action === "reject"
        ? { status: "rejected" as const, showOnHome: false }
        : { showOnHome: action === "home-on" && t.status === "approved" };
  return (await db.update(testimonials).set(set).where(eq(testimonials.id, id)).returning())[0];
}
export const listTestimonials = (db: DB) => db.select().from(testimonials).orderBy(desc(testimonials.createdAt));

/* Gallery */
export const galleryInput = z.object({
  caption: z.string().trim().min(2),
  alt: z.string().trim().min(2, "Alt text is required."),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#DCD6C2"),
  url: z.string().trim().url().optional().or(z.literal("").transform(() => undefined)),
  destinationSlug: z.string().trim().optional(),
  credit: z.string().trim().optional(),
  peopleConsent: z.coerce.boolean().default(false),
  visible: z.coerce.boolean().default(true),
});
export async function saveGalleryImage(db: DB, actor: StaffUser, id: number | null, raw: unknown) {
  assertCan(actor, "content.edit");
  const v = parse(galleryInput, raw);
  if (id) return (await db.update(galleryImages).set(v).where(eq(galleryImages.id, id)).returning())[0];
  return (await db.insert(galleryImages).values(v).returning())[0];
}
export async function deleteGalleryImage(db: DB, actor: StaffUser, id: number) {
  assertCan(actor, "content.edit");
  await db.delete(galleryImages).where(eq(galleryImages.id, id));
}
export const listGallery = (db: DB) => db.select().from(galleryImages).orderBy(asc(galleryImages.sortOrder));

/* Banners */
export const bannerInput = z
  .object({
    eyebrow: z.string().trim().max(40).default(""),
    headline: z.string().trim().min(4, "Write a headline.").max(90),
    subline: z.string().trim().max(140).default(""),
    ctaLabel: z.string().trim().min(2).max(30),
    ctaHref: z.string().trim().regex(/^\/[^\s]*$|^https:\/\/\S+$/, "Use a site path like /packages or a https:// link."),
    startsAt: z.string().optional().transform((v) => v || null),
    endsAt: z.string().optional().transform((v) => v || null),
    priority: z.coerce.number().int().default(0),
    status: z.enum(["live", "scheduled", "draft"]).default("draft"),
  })
  .refine((b) => !b.startsAt || !b.endsAt || b.endsAt >= b.startsAt, { path: ["endsAt"], message: "End must be after start." });
export async function saveBanner(db: DB, actor: StaffUser, id: number | null, raw: unknown) {
  assertCan(actor, "content.edit");
  const v = parse(bannerInput, raw);
  if (id) return (await db.update(banners).set(v).where(eq(banners.id, id)).returning())[0];
  return (await db.insert(banners).values(v).returning())[0];
}
export async function deleteBanner(db: DB, actor: StaffUser, id: number) {
  assertCan(actor, "content.edit");
  await db.delete(banners).where(eq(banners.id, id));
}
export const listBanners = (db: DB) => db.select().from(banners).orderBy(desc(banners.priority));

/* Offers */
export const offerInput = z
  .object({
    name: z.string().trim().min(2),
    badge: z.string().trim().min(2).max(24),
    discountType: z.enum(["flat", "percent"]),
    amount: z.coerce.number().int().min(1),
    packageIds: z.array(z.coerce.number().int()).default([]),
    terms: z.string().trim().default(""),
    validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    active: z.coerce.boolean().default(true),
  })
  .refine((o) => o.validTo >= o.validFrom, { path: ["validTo"], message: "End must be after start." })
  .refine((o) => o.discountType === "flat" || o.amount <= 90, { path: ["amount"], message: "Percent discounts max out at 90%." });
export async function saveOffer(db: DB, actor: StaffUser, id: number | null, raw: unknown) {
  assertCan(actor, "content.edit");
  const v = parse(offerInput, raw);
  if (id) return (await db.update(offers).set(v).where(eq(offers.id, id)).returning())[0];
  return (await db.insert(offers).values(v).returning())[0];
}
export const listOffers = (db: DB) => db.select().from(offers).orderBy(desc(offers.validTo));
