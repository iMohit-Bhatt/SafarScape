import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { getSettings } from "@/lib/settings";
import { whatsappLink } from "@/lib/whatsapp";
import { Photo } from "@/components/ui/Photo";
import { btn } from "@/components/ui/buttons";

export const metadata: Metadata = {
  title: "About us",
  description: "A small travel agency that still answers the phone. Every Safarscape trip is planned by a person, start to finish.",
  alternates: { canonical: "/about" },
};

const principles = [
  ["A call before a quote", "Fifteen minutes on the phone tells us more than any form. Who's travelling, knees, budgets, the one thing you'd hate."],
  ["Prices that show their working", "Hotels, transfers, permits and our fees, itemised. If something is cheaper booked directly, we'll say so."],
  ["Slower than the brochure", "We leave rest days in. Five places in five days looks good on paper and feels terrible on day four."],
  ["Someone awake while you travel", "A named advisor on WhatsApp for the whole trip — for a missed flight, a closed road, or a restaurant tip."],
];

export default async function AboutPage() {
  const settings = await getSettings(await getDb());
  const wa = whatsappLink(settings.agency.whatsapp, "Hi Safarscape, I'd like to talk about a trip.");
  return (
    <>
      <section className="page-x container-x flex flex-col justify-between gap-8 pb-12 pt-12 md:pt-20 lg:flex-row lg:items-end">
        <div className="flex flex-col gap-5">
          <p className="eyebrow">About Safarscape</p>
          <h1 className="max-w-[820px] font-display text-[44px] leading-[48px] tracking-[-0.025em] text-teal md:text-[72px] md:leading-[76px]">
            A small agency that still answers the phone.
          </h1>
        </div>
        <p className="max-w-[380px] text-[16px] leading-[26px] text-charcoal">
          We started Safarscape because booking a family trip online felt like filling in a tax return. Now a person plans each trip with you, start to finish.
        </p>
      </section>
      <section className="page-x container-x grid gap-4 md:grid-cols-[2fr_1fr] md:items-end">
        <figure className="flex flex-col gap-2">
          <Photo photo={{ color: "#DCD6C2", alt: "Office photo placeholder" }} scene="flat" className="h-[260px] md:h-[440px]" label="Office photo — set in admin" />
          <figcaption className="text-[12px] text-stone">The planning room, where most itineraries get argued over.</figcaption>
        </figure>
        <figure className="flex flex-col gap-2">
          <Photo photo={{ color: "#C9D3C3", alt: "Office photo placeholder" }} scene="flat" className="h-[200px] md:h-[330px]" label="Office photo — set in admin" />
          <figcaption className="text-[12px] text-stone">Maps, guidebooks and a lot of chai.</figcaption>
        </figure>
      </section>
      <section className="page-x container-x flex flex-col gap-8 py-16 md:py-24 lg:flex-row lg:gap-24">
        <div className="flex flex-col gap-3 lg:w-[380px] lg:shrink-0">
          <p className="eyebrow">01 — Our story</p>
          <h2 className="font-display text-[34px] leading-[40px] text-teal md:text-[40px] md:leading-[46px]">It began with one family trip to Kashmir.</h2>
        </div>
        <div className="flex max-w-[620px] flex-col gap-4 text-[16px] leading-[27px] text-charcoal">
          <p>A cousin&apos;s wedding, three generations, one week in Srinagar. Nobody could agree on hotels, Nani needed a ground-floor room, and the kids wanted snow. Getting it right took a dozen phone calls and a lot of local favours.</p>
          <p>That&apos;s still how we work. You tell us who&apos;s coming and what matters, we build a plan around it, and we stay on WhatsApp until you&apos;re home. We don&apos;t take payments on this site — every trip is confirmed with a person first.</p>
          <p className="text-[12px] text-stone">Founding story — final copy set in admin</p>
        </div>
      </section>
      <section className="bg-sand">
        <div className="page-x container-x flex flex-col gap-8 py-16 md:py-24">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="flex flex-col gap-3">
              <p className="eyebrow">02 — How we plan</p>
              <h2 className="font-display text-[34px] leading-[40px] text-teal md:text-[44px]">Four things we won&apos;t skip</h2>
            </div>
            <p className="max-w-[360px] text-[14px] text-charcoal">Whether it&apos;s a ₹20,000 weekend or a two-week honeymoon, the process is the same.</p>
          </div>
          <ol className="border-t border-sand-line">
            {principles.map(([t, b], i) => (
              <li key={t} className="grid gap-2 border-b border-sand-line py-6 md:grid-cols-[100px_1fr_1fr] md:gap-6">
                <span className="font-display text-[28px] text-teal">0{i + 1}</span>
                <h3 className="font-display text-[22px] leading-[28px] text-teal">{t}</h3>
                <p className="text-[15px] leading-6 text-charcoal">{b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="page-x container-x flex flex-col gap-10 py-16 md:py-24">
        <div className="flex flex-col justify-between gap-3 border-b border-line pb-5 md:flex-row md:items-end">
          <div className="flex flex-col gap-3">
            <p className="eyebrow">03 — The people</p>
            <h2 className="font-display text-[34px] leading-[40px] text-teal md:text-[44px]">Who&apos;ll be on the other end</h2>
          </div>
          <p className="text-[13px] text-stone">Names, photos and bios set in admin</p>
        </div>
        <ul className="grid grid-cols-2 gap-5 lg:grid-cols-4 lg:items-end">
          {[
            ["#E4E2DA", "Founder · Himalaya trips", "h-[240px] md:h-[300px]"],
            ["#DCD6C2", "Advisor · Kerala & South India", "h-[200px] md:h-[250px]"],
            ["#C9D3D2", "Advisor · Pilgrimages", "h-[240px] md:h-[300px]"],
            ["#D8E2CF", "Operations · On-trip support", "h-[200px] md:h-[250px]"],
          ].map(([c, role, h]) => (
            <li key={role} className="flex flex-col gap-3">
              <div className={`relative ${h} overflow-hidden`} style={{ backgroundColor: c }} aria-hidden>
                <span className="absolute left-1/2 top-[22%] h-[28%] w-[38%] -translate-x-1/2 rounded-full bg-black/10" />
                <span className="absolute -bottom-[10%] left-1/2 h-[40%] w-[66%] -translate-x-1/2 rounded-t-full bg-black/10" />
              </div>
              <div>
                <p className="font-display text-[18px] text-teal">Team member — set in admin</p>
                <p className="text-[13px] text-stone">{role}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-6 pt-6 md:flex-row md:gap-24">
          <div className="flex flex-col gap-3 md:w-[380px]">
            <p className="eyebrow">04 — Credentials</p>
            <h2 className="font-display text-[30px] leading-[36px] text-teal">Registrations &amp; memberships</h2>
          </div>
          <div className="flex flex-1 items-center gap-5 border border-dashed border-line p-6">
            <p className="text-[14px] leading-[22px] text-stone">
              <span className="block font-medium text-charcoal">Certifications appear here once verified</span>
              Tourism board registrations and association memberships are added after documents are checked. Nothing shows until then.
            </p>
          </div>
        </div>
      </section>
      <section className="border-t border-line">
        <div className="page-x container-x flex flex-col justify-between gap-6 py-16 md:flex-row md:items-center md:py-20">
          <h2 className="max-w-[640px] font-display text-[36px] leading-[42px] text-teal md:text-[48px] md:leading-[54px]">Tell us who&apos;s coming. We&apos;ll take it from there.</h2>
          <div className="flex gap-3">
            <Link href="/custom-trip" className={btn.primarySm}>Plan my trip</Link>
            {wa ? <a href={wa} className={btn.secondary} target="_blank" rel="noopener noreferrer">WhatsApp us</a> : <Link href="/contact" className={btn.secondary}>Contact us</Link>}
          </div>
        </div>
      </section>
    </>
  );
}
