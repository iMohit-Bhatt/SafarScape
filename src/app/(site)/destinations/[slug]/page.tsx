import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/db";
import { destinationBySlug, tripTypeShort } from "@/lib/catalogue";
import { getSettings } from "@/lib/settings";
import { whatsappLink } from "@/lib/whatsapp";
import { formatDate, formatINR, MONTHS } from "@/lib/format";
import { Photo } from "@/components/ui/Photo";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { PackageCard } from "@/components/site/PackageCard";
import { QuickCallbackForm } from "@/components/site/QuickCallbackForm";
import { JsonLd } from "@/components/site/JsonLd";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const d = await destinationBySlug(await getDb(), (await params).slug);
  if (!d) return { title: "Destination not found" };
  const title = d.seoTitle || `${d.name} tour packages & best time to visit`;
  return { title, description: d.seoDescription || d.tagline, alternates: { canonical: `/destinations/${d.slug}` }, openGraph: { title, description: d.tagline } };
}

const seasonStyle = {
  peak: "bg-teal text-ivory",
  good: "bg-[#C9D3C3] text-charcoal",
  avoid: "bg-white text-stone border border-dashed border-line",
};

export default async function DestinationPage({ params }: { params: Params }) {
  const db = await getDb();
  const d = await destinationBySlug(db, (await params).slug);
  if (!d) notFound();
  const settings = await getSettings(db);
  const wa = whatsappLink(settings.agency.whatsapp, `Hi Safarscape, I'd like to plan a trip to ${d.name}.`);
  const types = [...new Set(d.packages.map((p) => tripTypeShort[p.tripType].toLowerCase()))];
  const nights = d.packages.map((p) => p.nights);
  const cheapest = d.packages.length ? Math.min(...d.packages.map((p) => p.finalPrice)) : null;
  const verified = d.travelInfo.map((t) => t.verifiedOn).filter(Boolean).sort().at(-1);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "TouristDestination", name: d.name, description: d.intro, url: `${site}/destinations/${d.slug}` }} />
      <section className="relative">
        <Photo photo={{ ...d.hero, color: "#DDD6C2" }} scene="mountains" className="h-[260px] md:h-[440px]" />
        <div className="bg-teal">
          <div className="page-x container-x flex flex-col gap-4 py-8 md:flex-row md:items-end md:justify-between md:py-12">
            <div className="flex flex-col gap-4">
              <Breadcrumbs light items={[{ href: "/", label: "Home" }, { href: "/destinations", label: "Destinations" }, { label: d.name }]} />
              <h1 className="font-display text-[56px] leading-[60px] tracking-[-0.025em] text-ivory md:text-[104px] md:leading-[104px]">{d.name}</h1>
              <p className="max-w-[540px] text-[16px] leading-[26px] text-[#C8D5D3]">{d.tagline}</p>
            </div>
            <p className="text-[13px] text-ivory/70">Photo placeholder · {d.hero.caption ?? d.hero.alt}</p>
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="page-x container-x flex flex-col gap-10 py-14 lg:flex-row lg:items-start lg:justify-between lg:py-20">
          <p className="max-w-[720px] font-display text-[26px] leading-[36px] text-charcoal md:text-[32px] md:leading-[42px]">{d.intro}</p>
          <dl className="w-full lg:w-[360px]">
            {[
              ["Good for", types.length ? types.join(", ") : "Custom trips"],
              ["Ideal length", nights.length ? `${Math.min(...nights)} – ${Math.max(...nights)} nights` : "5 – 7 nights"],
              ["Packages", d.packages.length ? `${d.packages.length}, from ${formatINR(cheapest)}` : "Planned to order"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-t border-line py-3.5 text-[15px] first:border-t-0 lg:first:border-t">
                <dt className="text-[11px] tracking-[0.12em] text-stone uppercase">{k}</dt>
                <dd className="text-right capitalize text-charcoal">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {d.seasons.length === 12 && (
        <section className="page-x container-x flex flex-col gap-8 py-14 md:py-20">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="flex flex-col gap-3">
              <p className="eyebrow">When to go</p>
              <h2 className="font-display text-[34px] leading-[40px] text-teal md:text-[44px] md:leading-[50px]">{d.bestMonths}</h2>
            </div>
            <ul className="flex gap-5 text-[13px] text-stone" aria-label="Legend">
              <li className="flex items-center gap-2"><span className="h-3 w-3 bg-teal" /> Peak</li>
              <li className="flex items-center gap-2"><span className="h-3 w-3 bg-[#C9D3C3]" /> Good</li>
              <li className="flex items-center gap-2"><span className="h-3 w-3 border border-dashed border-line bg-white" /> Avoid</li>
            </ul>
          </div>
          <ol className="grid grid-cols-4 gap-1 sm:grid-cols-6 lg:grid-cols-12">
            {d.seasons.map((s) => (
              <li key={s.month} className="flex flex-col gap-1.5">
                <div className={`flex h-[72px] flex-col justify-between p-2.5 ${seasonStyle[s.season]}`}>
                  <span className="text-[14px]">{MONTHS[s.month - 1]}</span>
                  <span className="text-[10px] tracking-[0.12em] uppercase opacity-80">{s.season}</span>
                </div>
                <span className="min-h-4 text-[12px] text-stone">{s.note ?? ""}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {d.thingsToDo.length > 0 && (
        <section className="bg-sand">
          <div className="page-x container-x flex flex-col gap-10 py-16 md:py-24 lg:flex-row lg:gap-20">
            <div className="flex flex-col gap-4 lg:w-[360px] lg:shrink-0">
              <p className="eyebrow">What to do there</p>
              <h2 className="font-display text-[36px] leading-[42px] text-teal md:text-[44px] md:leading-[50px]">
                {["", "One thing", "Two things", "Three things", "Four things", "Five things", "Six things"][d.thingsToDo.length] ?? "Things"} worth the trip
              </h2>
              <p className="text-[15px] leading-6 text-charcoal">Our advisors&apos; shortlist. None of it needs a packed schedule.</p>
              {d.photos[0] && (
                <figure className="hidden flex-col gap-2 pt-6 lg:flex">
                  <Photo photo={d.photos[0]} className="h-[380px]" />
                  <figcaption className="text-[12px] text-stone">{d.photos[0].caption} — placeholder</figcaption>
                </figure>
              )}
            </div>
            <ol className="flex flex-1 flex-col border-t border-sand-line">
              {d.thingsToDo.map((t, i) => (
                <li key={t.title} className="flex gap-6 border-b border-sand-line py-6 md:gap-10">
                  <span className="font-display text-[20px] text-teal">0{i + 1}</span>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <h3 className="font-display text-[22px] leading-[28px] text-charcoal">{t.title}</h3>
                    <p className="text-[15px] leading-6 text-charcoal">{t.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {d.travelInfo.length > 0 && (
        <section className="page-x container-x flex flex-col gap-8 py-16 md:py-20">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="flex flex-col gap-3">
              <p className="eyebrow">Before you go</p>
              <h2 className="font-display text-[34px] leading-[40px] text-teal md:text-[44px] md:leading-[50px]">Getting there, practically</h2>
            </div>
            {verified && <p className="self-start rounded-[4px] bg-warning-bg px-3 py-1.5 text-[13px] text-warning">Checked {formatDate(verified)} — rules change, confirm before booking</p>}
          </div>
          <dl className="grid border-y border-line sm:grid-cols-2 lg:grid-cols-4">
            {d.travelInfo.map((t) => (
              <div key={t.label} className="flex flex-col gap-2 border-b border-line py-6 sm:pr-6 lg:border-b-0 lg:border-r lg:px-6 lg:first:pl-0 lg:last:border-r-0">
                <dt className="text-[11px] tracking-[0.12em] text-stone uppercase">{t.label}</dt>
                <dd className="text-[15px] leading-6 text-charcoal">{t.body}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="page-x container-x flex flex-col gap-10 pb-20">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-3">
            <p className="eyebrow">Packages</p>
            <h2 className="font-display text-[34px] leading-[40px] text-teal md:text-[44px] md:leading-[50px]">Ways to do {d.name}</h2>
          </div>
          {d.packages.length > 0 && <Link href={`/packages?dest=${d.slug}`} className="link-underline shrink-0 text-[15px] font-medium text-teal">See all {d.packages.length} →</Link>}
        </div>
        {d.packages.length ? (
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {d.packages.slice(0, 6).map((p) => (
              <PackageCard key={p.id} pkg={p} showType />
            ))}
          </div>
        ) : (
          <p className="text-[16px] text-stone">We plan {d.name} trips to order — tell us what you have in mind below.</p>
        )}
        {d.related.length > 0 && (
          <div className="flex flex-col gap-4 border-t border-line pt-8 md:flex-row md:items-center md:gap-10">
            <p className="eyebrow shrink-0">Also nearby</p>
            <ul className="grid flex-1 gap-4 sm:grid-cols-3">
              {d.related.map((r) => (
                <li key={r.id}>
                  <Link href={`/destinations/${r.slug}`} className="group flex items-center gap-4">
                    <span className="h-12 w-16 shrink-0" style={{ backgroundColor: r.hero.color }} aria-hidden />
                    <span className="flex flex-col">
                      <span className="font-display text-[20px] text-charcoal group-hover:text-teal">{r.name}</span>
                      <span className="text-[12px] text-stone">Best {r.bestMonths.split(" ·")[0]}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="bg-teal">
        <div className="page-x container-x flex flex-col gap-10 py-16 md:py-[96px] lg:flex-row lg:gap-24">
          <div className="flex flex-col gap-5 lg:w-[440px] lg:shrink-0">
            <p className="text-[12px] tracking-[0.14em] text-gold uppercase">Talk to an advisor</p>
            <h2 className="font-display text-[44px] leading-[48px] text-ivory md:text-[56px] md:leading-[60px]">Ask about {d.name}</h2>
            <p className="text-[16px] leading-[26px] text-[#C8D5D3]">
              Tell us roughly when and who. An advisor who has been there calls you back with a draft plan. Nothing is booked or charged online.
            </p>
          </div>
          <div className="flex-1">
            <QuickCallbackForm variant="destination" destinationSlug={d.slug} destinationName={d.name} whatsappHref={wa} />
          </div>
        </div>
      </section>
    </>
  );
}
