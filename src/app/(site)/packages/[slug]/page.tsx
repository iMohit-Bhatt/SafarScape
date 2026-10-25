import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/db";
import { packageBySlug, publishedPackages, tripTypeShort } from "@/lib/catalogue";
import { getSettings } from "@/lib/settings";
import { fillTemplate, whatsappLink } from "@/lib/whatsapp";
import { durationLabel, formatDateRange, formatINR } from "@/lib/format";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { PackageGallery } from "@/components/site/Gallery";
import { PackageEnquiry } from "@/components/site/PackageEnquiry";
import { PackageCard } from "@/components/site/PackageCard";
import { JsonLd } from "@/components/site/JsonLd";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await packageBySlug(await getDb(), slug);
  if (!pkg) return { title: "Package not found" };
  const title = pkg.seoTitle || `${pkg.title} — ${durationLabel(pkg.nights)} ${pkg.destination.name}`;
  const description = pkg.seoDescription || pkg.summary;
  return {
    title,
    description,
    alternates: { canonical: `/packages/${pkg.slug}` },
    openGraph: { title, description, type: "website", url: `/packages/${pkg.slug}` },
  };
}

export default async function PackagePage({ params }: { params: Params }) {
  const { slug } = await params;
  const db = await getDb();
  const pkg = await packageBySlug(db, slug);
  if (!pkg) notFound();
  const settings = await getSettings(db);
  const wa = whatsappLink(
    settings.agency.whatsapp,
    fillTemplate(settings.whatsappTemplate, { package_name: `${pkg.title} (${pkg.destination.name}, ${durationLabel(pkg.nights)})` }),
  );
  const related = (await publishedPackages(db))
    .filter((p) => p.id !== pkg.id && (p.destinationId === pkg.destinationId || p.tripType === pkg.tripType))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 3);
  const deps = pkg.departures.map((d) => ({ ...d, label: formatDateRange(d.startDate, d.endDate) }));
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [lede, ...rest] = pkg.overview.split(/(?<=[.—])\s+(?=[A-Z])/);

  return (
    <article className="pb-24 lg:pb-0">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TouristTrip",
          name: pkg.title,
          description: pkg.summary,
          url: `${site}/packages/${pkg.slug}`,
          touristType: tripTypeShort[pkg.tripType],
          itinerary: {
            "@type": "ItemList",
            itemListElement: pkg.itinerary.map((d) => ({ "@type": "ListItem", position: d.day, name: d.title })),
          },
          offers: {
            "@type": "Offer",
            price: pkg.finalPrice,
            priceCurrency: "INR",
            availability: "https://schema.org/InStock",
            url: `${site}/packages/${pkg.slug}`,
          },
          provider: { "@type": "TravelAgency", name: "Safarscape", url: site },
        }}
      />
      {pkg.faqs.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: pkg.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          }}
        />
      )}

      <header className="page-x container-x flex flex-col gap-6 pb-6 pt-8 md:pt-10">
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/destinations", label: "Destinations" },
            { href: `/destinations/${pkg.destination.slug}`, label: pkg.destination.name },
            { label: pkg.title },
          ]}
        />
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="flex flex-col gap-3">
            <p className="meta text-[12px]!">{pkg.destination.name} · {tripTypeShort[pkg.tripType]}</p>
            <h1 className="max-w-[820px] font-display text-[40px] leading-[44px] tracking-[-0.02em] text-teal md:text-[64px] md:leading-[68px]">{pkg.title}</h1>
          </div>
          <dl className="flex gap-10 pb-2">
            <div>
              <dt className="text-[11px] tracking-[0.12em] text-stone uppercase">Duration</dt>
              <dd className="text-[16px] text-charcoal">{pkg.nights}N / {pkg.nights + 1}D</dd>
            </div>
            {pkg.route && (
              <div>
                <dt className="text-[11px] tracking-[0.12em] text-stone uppercase">Route</dt>
                <dd className="text-[16px] text-charcoal">{pkg.route}</dd>
              </div>
            )}
          </dl>
        </div>
      </header>

      <div className="page-x container-x">
        <PackageGallery photos={pkg.photos} />
      </div>

      <div className="page-x container-x flex flex-col gap-12 py-10 md:py-14 lg:flex-row lg:items-start lg:gap-[100px]">
        <div className="flex min-w-0 flex-1 flex-col gap-16 lg:max-w-[760px]">
          <section className="flex flex-col gap-4">
            <p className="font-display text-[24px] leading-[32px] text-charcoal md:text-[28px] md:leading-[38px]">{lede}</p>
            {rest.length > 0 && <p className="text-[16px] leading-[26px] text-charcoal">{rest.join(" ")}</p>}
          </section>

          {pkg.itinerary.length > 0 && (
            <section aria-labelledby="itinerary">
              <div className="flex flex-col justify-between gap-2 border-b border-line pb-5 sm:flex-row sm:items-end">
                <h2 id="itinerary" className="font-display text-[34px] leading-[40px] text-teal md:text-[40px]">Day by day</h2>
                <p className="text-[13px] text-stone">Timings are flexible — tell your advisor what matters.</p>
              </div>
              <ol>
                {pkg.itinerary.map((d) => (
                  <li key={d.day} className="flex gap-6 border-b border-line py-7 md:gap-12">
                    <div className="w-12 shrink-0 md:w-[90px]">
                      <span className="block text-[11px] tracking-[0.12em] text-stone uppercase">Day</span>
                      <span className="font-display text-[32px] leading-[36px] text-teal">{String(d.day).padStart(2, "0")}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <h3 className="font-display text-[22px] leading-[28px] text-charcoal">{d.title}</h3>
                      <p className="text-[15px] leading-[25px] text-charcoal">{d.description}</p>
                      {(d.stay || d.meals) && (
                        <p className="text-[13px] text-stone">{[d.stay && `Stay: ${d.stay}`, d.meals && `Meals: ${d.meals}`].filter(Boolean).join(" · ")}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section aria-labelledby="price">
            <h2 id="price" className="border-b border-line pb-5 font-display text-[34px] leading-[40px] text-teal md:text-[40px]">What&apos;s in the price</h2>
            <div className="grid gap-8 pt-6 sm:grid-cols-2">
              <div>
                <p className="eyebrow mb-3">Included</p>
                <ul className="flex flex-col gap-3 text-[15px] text-charcoal">
                  {pkg.inclusions.map((x) => (
                    <li key={x}>✓ {x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow mb-3">Not included</p>
                <ul className="flex flex-col gap-3 text-[15px] text-stone">
                  {pkg.exclusions.map((x) => (
                    <li key={x}>— {x}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {pkg.hotels.length > 0 && (
            <section aria-labelledby="hotels">
              <h2 id="hotels" className="border-b border-line pb-5 font-display text-[34px] leading-[40px] text-teal md:text-[40px]">Where you&apos;ll stay</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-[15px]">
                  <thead className="text-[11px] tracking-[0.12em] text-stone uppercase">
                    <tr>
                      <th className="py-4 font-normal">Stop</th>
                      <th className="py-4 font-normal">Hotel</th>
                      <th className="py-4 font-normal">Category</th>
                      <th className="py-4 font-normal">Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pkg.hotels.map((h) => (
                      <tr key={h.stop} className="border-t border-line">
                        <td className="py-4 text-charcoal">{h.stop}</td>
                        <td className="py-4 text-charcoal">{h.name}</td>
                        <td className="py-4 text-stone">{h.category}</td>
                        <td className="py-4 text-stone">{h.roomType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="pt-3 text-[13px] text-stone">Or similar, depending on availability. Your advisor confirms hotels with the quote.</p>
            </section>
          )}

          <section aria-labelledby="departures">
            <h2 id="departures" className="border-b border-line pb-5 font-display text-[34px] leading-[40px] text-teal md:text-[40px]">Departures</h2>
            <ul>
              {deps.map((d) => (
                <li key={d.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-line py-5 text-[15px] sm:grid-cols-[180px_1fr_100px_90px]">
                  <span className="text-charcoal">{d.label}</span>
                  <span className={`order-3 sm:order-none ${d.status === "full" ? "text-stone" : d.seatsLeft <= 3 ? "text-terracotta" : "text-stone"}`}>
                    {d.status === "full" ? "Fully booked — join the waitlist" : d.seatsLeft <= 3 ? `Only ${d.seatsLeft} seats left` : `${d.seatsLeft} seats left`}
                  </span>
                  <span className="text-right text-charcoal">{formatINR(d.price)}</span>
                  <button type="button" data-enquire={d.id} className="order-4 text-right font-medium text-teal sm:order-none">
                    {d.status === "full" ? "Waitlist →" : "Enquire →"}
                  </button>
                </li>
              ))}
              <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-line py-5 text-[15px] sm:grid-cols-[180px_1fr_100px_90px]">
                <span className="text-charcoal">Your own dates</span>
                <span className="order-3 text-stone sm:order-none">Private departure, any day</span>
                <span className="text-right text-charcoal">On request</span>
                <button type="button" data-enquire="own" className="order-4 text-right font-medium text-teal sm:order-none">Enquire →</button>
              </li>
            </ul>
            {pkg.cancellationPolicy && <p className="pt-5 text-[13px] leading-5 text-stone">Cancellation: {pkg.cancellationPolicy}</p>}
          </section>

          {pkg.faqs.length > 0 && (
            <section aria-labelledby="faqs">
              <h2 id="faqs" className="border-b border-line pb-5 font-display text-[34px] leading-[40px] text-teal md:text-[40px]">Questions people ask</h2>
              {pkg.faqs.map((f) => (
                <details key={f.q} className="group border-b border-line py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] text-charcoal">
                    {f.q}
                    <span className="text-[20px] text-teal transition-transform group-open:rotate-45" aria-hidden>+</span>
                  </summary>
                  <p className="pt-3 text-[15px] leading-[25px] text-stone">{f.a}</p>
                </details>
              ))}
            </section>
          )}
        </div>

        <aside className="w-full lg:sticky lg:top-6 lg:w-[400px] lg:shrink-0" aria-label="Enquire">
          <PackageEnquiry
            ctx={{
              kind: "package",
              packageSlug: pkg.slug,
              title: pkg.title,
              meta: `${pkg.destination.name} · ${durationLabel(pkg.nights)}`,
              color: pkg.photos[0]?.color ?? "#9AA7A3",
              price: pkg.finalPrice,
              departures: deps.filter((d) => d.status === "open").map((d) => ({ id: d.id, label: d.label })),
            }}
            price={pkg.finalPrice}
            basePrice={pkg.priceFrom}
            priceNote={pkg.priceNote}
            offerTerms={pkg.offer?.terms}
            departures={deps}
            whatsappHref={wa}
          />
        </aside>
      </div>

      {related.length > 0 && (
        <section className="border-t border-line">
          <div className="page-x container-x flex flex-col gap-10 py-16 md:py-20">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-display text-[34px] leading-[40px] text-teal md:text-[40px]">You might also like</h2>
              <Link href={`/destinations/${pkg.destination.slug}`} className="link-underline text-[15px] font-medium text-teal">More in {pkg.destination.name} →</Link>
            </div>
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <PackageCard key={p.id} pkg={p} showType />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
