import type { Metadata } from "next";
import { getDb } from "@/db";
import { publishedDestinations } from "@/lib/catalogue";
import { getSettings } from "@/lib/settings";
import { whatsappLink } from "@/lib/whatsapp";
import { CustomTripForm } from "./CustomTripForm";

export const metadata: Metadata = {
  title: "Plan a custom trip",
  description: "Tell us where, when and who's travelling. An advisor calls back with a draft itinerary and an honest price. Nothing is booked or charged online.",
  alternates: { canonical: "/custom-trip" },
};

export default async function CustomTripPage() {
  const db = await getDb();
  const [dests, settings] = await Promise.all([publishedDestinations(db), getSettings(db)]);
  return (
    <CustomTripForm
      destinations={dests.map((d) => d.name)}
      whatsappHref={whatsappLink(settings.agency.whatsapp, "Hi Safarscape, I'm planning a custom trip and had a question.")}
    />
  );
}
