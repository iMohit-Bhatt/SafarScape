import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { publishedDestinations } from "@/lib/catalogue";
import { formatINR } from "@/lib/format";
import { Photo } from "@/components/ui/Photo";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";

export const metadata: Metadata = {
  title: "Destinations",
  description: "Kashmir, Kerala, Rajasthan, Ladakh, Goa, the Andamans and more — best months, what to skip, and every trip we run there.",
  alternates: { canonical: "/destinations" },
};

export default async function DestinationsPage() {
  const dests = await publishedDestinations(await getDb());
  const regions = [...new Set(dests.map((d) => d.region))];
  return (
    <>
      <section className="page-x container-x flex flex-col gap-4 pb-12 pt-10 md:pt-14">
        <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Destinations" }]} />
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <h1 className="font-display text-[48px] leading-[52px] tracking-[-0.025em] text-teal md:text-[72px] md:leading-[76px]">Places we know well</h1>
          <p className="max-w-[400px] text-[16px] leading-[26px] text-stone">Each page has the best months, what to skip, and every package we run there.</p>
        </div>
      </section>
      {regions.map((r) => (
        <section key={r} className="page-x container-x flex flex-col gap-8 pb-16">
          <h2 className="border-b border-line pb-4 text-[12px] tracking-[0.14em] text-stone uppercase">{r}</h2>
          <ul className="grid gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {dests
              .filter((d) => d.region === r)
              .map((d) => (
                <li key={d.id}>
                  <Link href={`/destinations/${d.slug}`} className="group flex flex-col gap-4">
                    <Photo photo={d.hero} className="h-[240px] md:h-[300px]" />
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-display text-[30px] leading-[36px] text-charcoal group-hover:text-teal">{d.name}</span>
                      <span className="text-[14px] text-stone">Best {d.bestMonths.split(" ·")[0]}</span>
                    </div>
                    <p className="text-[15px] leading-6 text-stone">{d.tagline}</p>
                    <p className="text-[14px] text-charcoal">
                      {d.packageCount ? `${d.packageCount} package${d.packageCount > 1 ? "s" : ""} · from ${formatINR(d.priceFrom)}` : "Custom trips only"}
                    </p>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}
