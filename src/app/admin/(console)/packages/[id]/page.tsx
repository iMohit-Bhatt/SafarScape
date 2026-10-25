import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { packages, destinations } from "@/db/schema";
import { requirePageUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { packageDepartures } from "@/lib/admin-catalogue";
import { PackageEditor } from "../PackageEditor";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: `Package ${(await params).id}` };
}

export default async function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const id = Number((await params).id);
  const db = await getDb();
  const [p] = Number.isInteger(id) ? await db.select().from(packages).where(eq(packages.id, id)) : [];
  if (!p) notFound();
  const [dests, deps] = await Promise.all([
    db.select({ id: destinations.id, name: destinations.name, slug: destinations.slug }).from(destinations).orderBy(asc(destinations.name)),
    packageDepartures(db, id),
  ]);
  return (
    <PackageEditor
      id={p.id}
      status={p.status}
      updatedAt={p.updatedAt.toISOString()}
      destinations={dests}
      departures={deps}
      canEdit={can(user.role, "catalogue.edit")}
      canPublish={can(user.role, "catalogue.publish")}
      siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}
      initial={{
        title: p.title, slug: p.slug, destinationId: p.destinationId, tripType: p.tripType, nights: p.nights, route: p.route, summary: p.summary,
        overview: p.overview, priceFrom: p.priceFrom, priceNote: p.priceNote, featured: p.featured, travelMonths: p.travelMonths, photos: p.photos,
        itinerary: p.itinerary, hotels: p.hotels, inclusions: p.inclusions, exclusions: p.exclusions, faqs: p.faqs,
        cancellationPolicy: p.cancellationPolicy, seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "",
      }}
    />
  );
}
