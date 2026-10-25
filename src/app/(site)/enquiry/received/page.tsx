import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { publishedPackages } from "@/lib/catalogue";
import { getSettings } from "@/lib/settings";
import { whatsappLink } from "@/lib/whatsapp";
import { PackageCard } from "@/components/site/PackageCard";
import { ReceivedDetails } from "./ReceivedDetails";

export const metadata: Metadata = { title: "Enquiry received", robots: { index: false } };

export default async function ReceivedPage() {
  const db = await getDb();
  const [pkgs, settings] = await Promise.all([publishedPackages(db), getSettings(db)]);
  const ideas = pkgs.sort((a, b) => b.popularity - a.popularity).slice(3, 6);
  return (
    <>
      <ReceivedDetails whatsappNumber={settings.agency.whatsapp} hasWhatsApp={Boolean(whatsappLink(settings.agency.whatsapp, "x"))} />
      <section className="bg-sand">
        <div className="page-x container-x flex flex-col gap-10 py-16 md:py-20">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-[32px] leading-[38px] text-teal md:text-[48px] md:leading-[52px]">While you wait, other ideas</h2>
            <Link href="/packages" className="link-underline shrink-0 text-[15px] font-medium text-teal">All packages →</Link>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {ideas.map((p) => (
              <PackageCard key={p.id} pkg={p} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
