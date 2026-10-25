import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { destinations } from "@/db/schema";
import { requirePageUser } from "@/lib/session";
import { PackageEditor } from "../PackageEditor";

export const metadata = { title: "New package" };

export default async function NewPackagePage() {
  await requirePageUser("catalogue.edit");
  const dests = await (await getDb()).select({ id: destinations.id, name: destinations.name, slug: destinations.slug }).from(destinations).orderBy(asc(destinations.name));
  return (
    <PackageEditor
      id={null}
      status={null}
      destinations={dests}
      departures={[]}
      canEdit
      canPublish={false}
      siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}
      initial={{
        title: "", slug: "", destinationId: 0, tripType: "honeymoon", nights: 5, route: "", summary: "", overview: "", priceFrom: 0,
        priceNote: "Twin sharing, excluding flights.", featured: false, travelMonths: [], photos: [], itinerary: [], hotels: [],
        inclusions: [], exclusions: [], faqs: [], cancellationPolicy: "Full refund up to 30 days before departure, 50% up to 15 days, no refund after. The full policy is shared with your quote.",
        seoTitle: "", seoDescription: "",
      }}
    />
  );
}
