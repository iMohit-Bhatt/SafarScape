import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { publishedPackages, publishedDestinations, publishedPosts, filterPackages } from "@/lib/catalogue";
import { PackageCard } from "@/components/site/PackageCard";
import { btn } from "@/components/ui/buttons";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const db = await getDb();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const match = (s: string) => words.length > 0 && words.every((w) => s.toLowerCase().includes(w));
  const pkgs = q ? filterPackages(await publishedPackages(db), { q, page: 1 }).items : [];
  const dests = q ? (await publishedDestinations(db)).filter((d) => match(`${d.name} ${d.region} ${d.tagline}`)) : [];
  const posts = q ? (await publishedPosts(db)).filter((p) => match(`${p.title} ${p.excerpt} ${p.category}`)) : [];
  const total = pkgs.length + dests.length + posts.length;
  return (
    <div className="page-x container-x pb-24 pt-10 md:pt-16">
      <form action="/search" role="search" className="flex flex-col gap-3 border-b border-line pb-8">
        <label htmlFor="q" className="eyebrow">Search trips, places and guides</label>
        <div className="flex gap-3">
          <input id="q" name="q" defaultValue={q} placeholder="Kashmir in January, houseboat, Char Dham…" className="w-full border-0 border-b-2 border-teal bg-transparent pb-2 font-display text-[32px] text-teal outline-none placeholder:text-stone/50 md:text-[48px]" />
          <button className={`${btn.primarySm} self-end`}>Search</button>
        </div>
      </form>
      {q && (
        <p className="py-6 text-[15px] text-stone" aria-live="polite">
          {total} result{total === 1 ? "" : "s"} for “{q}”
        </p>
      )}
      {q && total === 0 && (
        <div className="flex flex-col items-start gap-5 py-10">
          <h1 className="font-display text-[40px] leading-[46px] text-teal">Nothing matches “{q}” — yet.</h1>
          <p className="max-w-[540px] text-[16px] leading-[26px] text-stone">Check the spelling, try a broader word like a state or a season, or tell us what you have in mind — most of our trips are planned from scratch.</p>
          <div className="flex gap-3">
            <Link href="/packages" className={btn.secondary}>Browse all packages</Link>
            <Link href="/custom-trip" className={btn.primary}>Plan a custom trip</Link>
          </div>
        </div>
      )}
      {dests.length > 0 && (
        <section className="flex flex-col gap-4 py-6">
          <h2 className="eyebrow">Destinations</h2>
          <ul className="flex flex-wrap gap-3">
            {dests.map((d) => <li key={d.id}><Link href={`/destinations/${d.slug}`} className="inline-block border border-line bg-white px-5 py-3 font-display text-[22px] text-teal">{d.name} →</Link></li>)}
          </ul>
        </section>
      )}
      {pkgs.length > 0 && (
        <section className="flex flex-col gap-6 py-6">
          <h2 className="eyebrow">Packages</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{pkgs.map((p) => <PackageCard key={p.id} pkg={p} showType />)}</div>
        </section>
      )}
      {posts.length > 0 && (
        <section className="flex flex-col gap-4 py-6">
          <h2 className="eyebrow">Guides</h2>
          <ul className="border-t border-line">
            {posts.map((p) => <li key={p.id} className="border-b border-line"><Link href={`/guides/${p.slug}`} className="flex justify-between py-4"><span className="font-display text-[20px] text-charcoal">{p.title}</span><span className="text-[13px] text-stone">{p.category}</span></Link></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
