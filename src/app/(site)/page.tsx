import Link from "next/link";
import { getDb } from "@/db";
import { publishedPackages, publishedDestinations, tripTypes, liveBanner } from "@/lib/catalogue";
import { getSettings } from "@/lib/settings";
import { whatsappLink } from "@/lib/whatsapp";
import { formatINR, MONTHS_LONG } from "@/lib/format";
import { Photo } from "@/components/ui/Photo";
import { btn } from "@/components/ui/buttons";
import { OfferBadge } from "@/components/site/PackageCard";
import { QuickCallbackForm } from "@/components/site/QuickCallbackForm";
import { SectionHead } from "@/components/site/SectionHead";

export default async function HomePage() {
  const db = await getDb();
  const [all, dests, settings, banner] = await Promise.all([
    publishedPackages(db),
    publishedDestinations(db),
    getSettings(db),
    liveBanner(db),
  ]);
  const featured = all
    .filter((p) => p.featured)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 3);
  const [lead, ...side] = featured.length ? featured : all.slice(0, 3);
  const pick = (slug: string) => dests.find((d) => d.slug === slug);
  const places = ["ladakh", "rajasthan", "goa", "bali"].map(pick).filter(Boolean) as typeof dests;
  const wa = whatsappLink(settings.agency.whatsapp, "Hi Safarscape, I'd like help planning a trip.");

  return (
    <>
      {banner && (
        <div className="bg-teal text-ivory">
          <div className="page-x container-x flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-2.5 text-center text-[14px]">
            {banner.eyebrow && <span className="text-[12px] tracking-[0.12em] text-gold uppercase">{banner.eyebrow}</span>}
            <span>{banner.headline}</span>
            <Link href={banner.ctaHref} className="border-b border-ivory/50 pb-px font-medium">
              {banner.ctaLabel} →
            </Link>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="container-x flex flex-col gap-10 pt-10 md:pt-[72px] lg:flex-row lg:items-end lg:gap-16 lg:pl-20">
        <div className="page-x flex flex-col gap-6 lg:w-[560px] lg:shrink-0 lg:px-0 lg:pb-16 lg:gap-7">
          <p className="eyebrow">Issue 01 — Winter in the Himalaya</p>
          <h1 className="font-display text-[44px] leading-[46px] tracking-[-0.025em] text-teal md:text-[72px] md:leading-[74px] xl:text-[84px] xl:leading-[84px]">
            Trips planned by people who pick up the phone.
          </h1>
          <p className="max-w-[470px] text-[17px] leading-[28px] text-charcoal md:text-[18px] md:leading-[29px]">
            Honeymoons, family holidays, pilgrimages and treks, planned around you. Tell us where you&apos;d like to go and an advisor will call you back.
          </p>
          <div className="flex flex-wrap items-center gap-7 pt-2">
            <Link href="/packages" className={btn.primary}>Explore packages</Link>
            <Link href="/custom-trip" className="link-underline text-[16px] font-medium text-teal">Plan a custom trip →</Link>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <Photo
            photo={{ color: "#D9C7A8", alt: "Mountains above a high-altitude lake in Ladakh in winter", caption: "Pangong Tso" }}
            scene="mountains"
            className="h-[320px] md:h-[480px] lg:h-[600px]"
            label="Photo placeholder"
            priority
          />
          <div className="page-x flex justify-between gap-4 lg:pl-0 lg:pr-20">
            <span className="text-[13px] text-stone">Pangong Tso, Ladakh — early February, 4,350 m</span>
            <Link href="/packages/ladakh-winter-pangong-7n" className="font-display text-[15px] italic text-teal">Ladakh in winter, 7 nights</Link>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="page-x container-x pt-10 md:pt-14">
        <form action="/packages" method="get" role="search" aria-label="Find trips" className="flex flex-col rounded-[4px] border border-line bg-white md:flex-row">
          <label className="flex flex-1 flex-col gap-1.5 border-b border-line px-5 py-4 md:border-b-0 md:border-r md:px-7 md:py-5">
            <span className="text-[12px] tracking-[0.12em] text-stone uppercase">Where to</span>
            <input name="q" placeholder="Kashmir, Kerala, Bali…" className="bg-transparent text-[17px] text-charcoal outline-none placeholder:text-stone" />
          </label>
          <div className="grid grid-cols-2 md:contents">
            <label className="flex flex-col gap-1.5 border-b border-r border-line px-5 py-4 md:w-[240px] md:border-b-0 md:px-7 md:py-5">
              <span className="text-[12px] tracking-[0.12em] text-stone uppercase">When</span>
              <select name="month" className="bg-transparent text-[17px] text-charcoal outline-none" defaultValue="">
                <option value="">Any month</option>
                {MONTHS_LONG.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 border-b border-line px-5 py-4 md:w-[260px] md:border-b-0 md:border-r md:px-7 md:py-5">
              <span className="text-[12px] tracking-[0.12em] text-stone uppercase">Budget per person</span>
              <select name="budget" className="bg-transparent text-[17px] text-charcoal outline-none" defaultValue="">
                <option value="">Any budget</option>
                <option value="0-25000">Under ₹25,000</option>
                <option value="25000-60000">₹25,000 – ₹60,000</option>
                <option value="60000-">Over ₹60,000</option>
              </select>
            </label>
          </div>
          <div className="flex items-center p-3">
            <button type="submit" className={`${btn.primary} w-full px-8 py-[18px]`}>Find trips</button>
          </div>
        </form>
      </section>

      {/* Featured */}
      {lead && (
        <section className="page-x container-x flex flex-col gap-10 py-20 md:py-[120px]">
          <SectionHead eyebrow="01 — This season" title="Trips our advisors keep recommending" link={{ href: "/packages", label: "All packages →" }} />
          <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-10">
            <article className="flex flex-col gap-5 lg:w-[58%] lg:shrink-0">
              <Link href={`/packages/${lead.slug}`} aria-label={lead.title}>
                <Photo photo={lead.photos[0] ?? { color: "#DCD6C2", alt: lead.title }} scene="snow" className="h-[280px] md:h-[480px]">
                  {lead.offer && <OfferBadge text={`Early-bird · ${lead.offer.badge}`} />}
                </Photo>
              </Link>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start sm:gap-8">
                <div className="flex flex-col gap-2">
                  <p className="meta">{lead.destination.name} · {lead.nights} nights · {lead.tripType}</p>
                  <h3 className="font-display text-[28px] leading-[34px] tracking-[-0.015em] text-charcoal md:text-[34px] md:leading-[40px]">
                    <Link href={`/packages/${lead.slug}`} className="hover:text-teal">{lead.title}</Link>
                  </h3>
                  <p className="max-w-[470px] text-[16px] leading-[25px] text-stone">{lead.summary}</p>
                </div>
                <div className="flex shrink-0 flex-col sm:items-end">
                  <span className="text-[13px] text-stone">from</span>
                  <span className="font-display text-[34px] leading-[42px] text-teal">{formatINR(lead.priceFrom)}</span>
                  <span className="text-[13px] text-stone">per person</span>
                </div>
              </div>
            </article>
            <div className="flex flex-1 flex-col gap-10 lg:pt-24">
              {side.map((p, i) => (
                <article key={p.id} className={`flex flex-col gap-4 ${i > 0 ? "border-t border-line pt-8" : ""}`}>
                  {i === 0 && (
                    <Link href={`/packages/${p.slug}`} aria-label={p.title}>
                      <Photo photo={p.photos[0] ?? { color: "#CFD9C6", alt: p.title }} scene="hills" className="h-[220px] md:h-[260px]" />
                    </Link>
                  )}
                  <div className="flex items-end justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                      <p className="meta">{p.destination.name} · {p.nights} nights · {p.tripType}</p>
                      <h3 className="font-display text-[24px] leading-[30px] text-charcoal md:text-[26px] md:leading-[32px]">
                        <Link href={`/packages/${p.slug}`} className="hover:text-teal">{p.title}</Link>
                      </h3>
                    </div>
                    <span className="shrink-0 font-display text-[24px] leading-[30px] text-teal">{formatINR(p.finalPrice)}</span>
                  </div>
                  {i > 0 && <p className="text-[15px] leading-6 text-stone">{p.summary}</p>}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Ways to travel */}
      <section className="bg-sand">
        <div className="page-x container-x flex flex-col gap-10 py-16 md:py-24 lg:flex-row lg:gap-20">
          <div className="flex flex-col gap-4 lg:w-[400px] lg:shrink-0">
            <p className="eyebrow">02 — Ways to travel</p>
            <h2 className="font-display text-[36px] leading-[40px] tracking-[-0.02em] text-teal md:text-[48px] md:leading-[52px]">Who&apos;s coming along?</h2>
            <p className="text-[16px] leading-[26px] text-charcoal">
              A honeymoon and a family trip to the same valley are planned very differently. Start with the trip, then the place.
            </p>
          </div>
          <ul className="flex flex-1 flex-col border-t border-sand-line">
            {tripTypes.map((t, i) => (
              <li key={t.value}>
                <Link href={`/packages?type=${t.value}`} className="group flex items-center gap-2 border-b border-sand-line py-5 md:py-[22px]">
                  <span className="w-10 shrink-0 text-[13px] text-stone md:w-14">0{i + 1}</span>
                  <span className="flex flex-1 flex-col gap-1 md:flex-row md:items-center">
                    <span className="flex-1 font-display text-[26px] leading-[32px] text-teal md:text-[34px] md:leading-[42px]">{t.label}</span>
                    <span className="text-[14px] text-charcoal md:w-[370px] md:shrink-0 md:text-[15px]">{t.blurb}</span>
                  </span>
                  <span className="w-8 shrink-0 text-right text-[18px] text-teal transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Places */}
      {places.length === 4 && (
        <section className="page-x container-x flex flex-col gap-12 py-20 md:py-[120px]">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="flex flex-col gap-3">
              <p className="eyebrow">03 — Places we know well</p>
              <h2 className="max-w-[620px] font-display text-[36px] leading-[40px] tracking-[-0.02em] text-teal md:text-[48px] md:leading-[52px]">
                Where we&apos;d send our own families
              </h2>
            </div>
            <p className="max-w-[360px] text-[16px] leading-[26px] text-stone">
              Each destination page has the best months, what to skip, and every package we run there.
            </p>
          </div>
          <div className="grid gap-10 md:grid-cols-3 md:items-start md:gap-8 lg:gap-[56px]">
            <PlaceTile d={places[0]} className="h-[340px] md:h-[560px]" scene="mountains" />
            <div className="flex flex-col gap-10 md:pt-24">
              <PlaceTile d={places[1]} className="h-[260px] md:h-[300px]" scene="desert" />
              <PlaceTile d={places[2]} className="h-[180px] md:h-[200px]" scene="beach" />
            </div>
            <div className="flex flex-col gap-7 md:pt-6">
              <blockquote className="flex flex-col gap-2.5 border-l-2 border-gold pl-5">
                <p className="font-display text-[22px] italic leading-[30px] text-teal">
                  &ldquo;Go to Spiti in late September — the roads are open and the crowds have gone home.&rdquo;
                </p>
                <footer className="text-[13px] text-stone">Advisor&apos;s note</footer>
              </blockquote>
              <PlaceTile d={places[3]} className="h-[320px] md:h-[400px]" scene="hills" />
            </div>
          </div>
          <Link href="/destinations" className={`${btn.secondary} self-start`}>All destinations</Link>
        </section>
      )}

      {/* Custom trip CTA */}
      <section className="bg-teal">
        <div className="page-x container-x flex flex-col gap-10 py-16 md:py-[104px] lg:flex-row lg:items-start lg:gap-24">
          <div className="flex flex-col gap-5 lg:w-[520px] lg:shrink-0">
            <p className="text-[12px] tracking-[0.14em] text-gold uppercase">04 — Made for you</p>
            <h2 className="font-display text-[40px] leading-[44px] tracking-[-0.02em] text-ivory md:text-[56px] md:leading-[60px]">
              Don&apos;t see your trip? Tell us about it.
            </h2>
            <p className="text-[17px] leading-[28px] text-[#C8D5D3]">
              Share a few details and an advisor will call with a draft itinerary and an honest price. No obligation to book.
            </p>
          </div>
          <div className="flex-1">
            <QuickCallbackForm whatsappHref={wa} />
          </div>
        </div>
      </section>
    </>
  );
}

function PlaceTile({ d, className, scene }: { d: { slug: string; name: string; bestMonths: string; hero: { color: string; alt: string } }; className: string; scene: "mountains" | "desert" | "beach" | "hills" }) {
  return (
    <Link href={`/destinations/${d.slug}`} className="group flex flex-col gap-3.5">
      <Photo photo={d.hero} scene={scene} className={className} />
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-display text-[30px] leading-[36px] text-charcoal group-hover:text-teal">{d.name}</span>
        <span className="text-[14px] text-stone">Best {d.bestMonths.split(" ·")[0]}</span>
      </span>
    </Link>
  );
}
