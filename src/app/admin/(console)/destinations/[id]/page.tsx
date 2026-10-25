import { notFound } from "next/navigation";
import { asc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { destinations, packages } from "@/db/schema";
import { requirePageUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { DestinationEditor } from "../DestinationEditor";

export const metadata = { title: "Destination" };

export default async function EditDestination({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const id = Number((await params).id);
  const db = await getDb();
  const [d] = Number.isInteger(id) ? await db.select().from(destinations).where(eq(destinations.id, id)) : [];
  if (!d) notFound();
  const others = await db.select({ slug: destinations.slug, name: destinations.name }).from(destinations).where(ne(destinations.id, id)).orderBy(asc(destinations.name));
  const pkgs = await db.select({ id: packages.id, title: packages.title, status: packages.status }).from(packages).where(eq(packages.destinationId, id));
  return (
    <DestinationEditor
      id={d.id}
      status={d.status}
      others={others}
      packages={pkgs}
      canEdit={can(user.role, "catalogue.edit")}
      canPublish={can(user.role, "catalogue.publish")}
      initial={{ name: d.name, slug: d.slug, region: d.region, tagline: d.tagline, intro: d.intro, bestMonths: d.bestMonths, hero: d.hero, photos: d.photos, highlights: d.highlights, seasons: d.seasons, thingsToDo: d.thingsToDo, travelInfo: d.travelInfo, relatedSlugs: d.relatedSlugs, seoTitle: d.seoTitle ?? "", seoDescription: d.seoDescription ?? "" }}
    />
  );
}
