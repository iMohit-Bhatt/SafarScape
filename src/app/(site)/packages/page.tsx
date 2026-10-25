import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { publishedPackages, filterPackages, parseFilters, tripTypeShort } from "@/lib/catalogue";
import { formatINRShort, MONTHS } from "@/lib/format";
import { PackageCard } from "@/components/site/PackageCard";
import { FilterPanel, SortSelect, ActiveChips, MobileFilterButton } from "@/components/site/ListingFilters";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { btn } from "@/components/ui/buttons";

export const metadata: Metadata = {
  title: "All holiday packages",
  description: "Honeymoon, family, adventure, pilgrimage and group trips across India and abroad. Every trip can be changed — dates, hotels, pace.",
  alternates: { canonical: "/packages" },
};

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function PackagesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const f = parseFilters(sp);
  const db = await getDb();
  const all = await publishedPackages(db);
  const result = filterPackages(all, f);

  const destCounts = new Map<string, { slug: string; name: string; count: number }>();
  for (const p of all) {
    const cur = destCounts.get(p.destination.slug) ?? { slug: p.destination.slug, name: p.destination.name, count: 0 };
    cur.count++;
    destCounts.set(p.destination.slug, cur);
  }
  const dests = [...destCounts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const chips: { key: string; value?: string; label: string }[] = [
    ...(f.q ? [{ key: "q", label: `“${f.q}”` }] : []),
    ...(f.dest ?? []).map((d) => ({ key: "dest", value: d, label: destCounts.get(d)?.name ?? d })),
    ...(f.type ?? []).map((t) => ({ key: "type", value: t, label: tripTypeShort[t as keyof typeof tripTypeShort] ?? t })),
    ...(f.min || f.max ? [{ key: "price", label: `${f.min ? formatINRShort(f.min) : "₹0"} – ${f.max ? formatINRShort(f.max) : "any"}` }] : []),
    ...(f.dur ? [{ key: "dur", label: { short: "Up to 4 nights", mid: "5 – 7 nights", long: "8+ nights" }[f.dur] }] : []),
    ...(f.months ?? []).map((m) => ({ key: "month", value: String(m), label: MONTHS[m - 1] })),
  ];

  const pageHref = (n: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page") q.set(k, Array.isArray(v) ? v.join(",") : v);
    if (n > 1) q.set("page", String(n));
    return `/packages${q.size ? `?${q}` : ""}`;
  };
  const from = result.total ? (result.page - 1) * 9 + 1 : 0;
  const to = (result.page - 1) * 9 + result.items.length;

  return (
    <>
      <section className="page-x container-x flex flex-col justify-between gap-6 pb-10 pt-10 md:flex-row md:items-end md:pt-14">
        <div className="flex flex-col gap-4">
          <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Packages" }]} />
          <h1 className="font-display text-[48px] leading-[52px] tracking-[-0.025em] text-teal md:text-[72px] md:leading-[76px]">All packages</h1>
        </div>
        <p className="max-w-[400px] text-[16px] leading-[26px] text-stone">
          Every trip can be changed — dates, hotels, pace. These are starting points, priced honestly.
        </p>
      </section>

      <div className="border-y border-line">
        <div className="page-x container-x flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[15px] font-medium text-charcoal" aria-live="polite" data-testid="result-count">
              {result.total} of {all.length} packages
            </span>
            {chips.length > 0 && <span className="text-stone">·</span>}
            <ActiveChips chips={chips} />
          </div>
          <div className="flex items-center gap-3">
            <MobileFilterButton dests={dests} count={chips.length} />
            <SortSelect />
          </div>
        </div>
      </div>

      <div className="page-x container-x flex gap-14 pb-24 pt-10">
        <aside className="hidden w-[280px] shrink-0 lg:block" aria-label="Filters">
          <FilterPanel dests={dests} />
        </aside>
        <div className="flex flex-1 flex-col gap-12">
          {result.total === 0 ? (
            <div className="flex flex-col items-start gap-5 border border-line bg-white p-8 md:p-12">
              <p className="eyebrow">No exact matches</p>
              <h2 className="font-display text-[34px] leading-[40px] text-teal">Nothing fits all of that — yet.</h2>
              <p className="max-w-[520px] text-[16px] leading-[26px] text-stone">
                Try removing a filter, or tell us what you had in mind. Most of our trips are planned from scratch anyway.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/packages" className={btn.secondary}>Clear filters</Link>
                <Link href="/custom-trip" className={btn.primary}>Plan a custom trip</Link>
              </div>
            </div>
          ) : (
            <ul className="grid gap-x-7 gap-y-12 sm:grid-cols-2 xl:grid-cols-3" data-testid="package-grid">
              {result.items.map((p) => (
                <li key={p.id}>
                  <PackageCard pkg={p} />
                </li>
              ))}
            </ul>
          )}
          {result.total > 0 && (
            <nav aria-label="Pagination" className="flex items-center justify-between border-t border-line pt-6">
              <span className="text-[14px] text-charcoal">Showing {from}–{to} of {result.total}</span>
              <div className="flex items-center gap-2 text-[15px]">
                {result.page > 1 ? <Link href={pageHref(result.page - 1)} className="px-3 py-1.5 text-teal">← Previous</Link> : <span className="px-3 py-1.5 text-stone/60">← Previous</span>}
                {Array.from({ length: result.pages }, (_, i) => i + 1).map((n) => (
                  <Link key={n} href={pageHref(n)} aria-current={n === result.page ? "page" : undefined} className={`flex h-8 min-w-8 items-center justify-center rounded-[4px] px-2 ${n === result.page ? "bg-teal text-ivory" : "text-charcoal hover:bg-white"}`}>
                    {n}
                  </Link>
                ))}
                {result.page < result.pages ? <Link href={pageHref(result.page + 1)} className="px-3 py-1.5 text-teal">Next →</Link> : <span className="px-3 py-1.5 text-stone/60">Next →</span>}
              </div>
            </nav>
          )}
          <div className="flex flex-col items-start justify-between gap-5 bg-sand px-6 py-8 md:flex-row md:items-center md:px-9">
            <div>
              <h2 className="font-display text-[30px] leading-[36px] text-teal">Not quite right?</h2>
              <p className="text-[16px] text-charcoal">Any of these can be reshaped, or we&apos;ll plan one from scratch.</p>
            </div>
            <Link href="/custom-trip" className={btn.primarySm}>Plan a custom trip</Link>
          </div>
        </div>
      </div>
    </>
  );
}
