import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { destinations } from "@/db/schema";
import { requirePageUser } from "@/lib/session";
import { DestinationEditor } from "../DestinationEditor";

export const metadata = { title: "New destination" };

export default async function NewDestination() {
  await requirePageUser("catalogue.edit");
  const others = await (await getDb()).select({ slug: destinations.slug, name: destinations.name }).from(destinations).orderBy(asc(destinations.name));
  return (
    <DestinationEditor
      id={null}
      status={null}
      others={others}
      packages={[]}
      canEdit
      canPublish={false}
      initial={{ name: "", slug: "", region: "", tagline: "", intro: "", bestMonths: "", hero: { color: "#DCD6C2", alt: "" }, photos: [], highlights: [], seasons: [], thingsToDo: [], travelInfo: [], relatedSlugs: [], seoTitle: "", seoDescription: "" }}
    />
  );
}
