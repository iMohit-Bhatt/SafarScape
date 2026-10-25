import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { publishedPosts } from "@/lib/catalogue";
import { formatDate } from "@/lib/format";
import { Photo } from "@/components/ui/Photo";

export const metadata: Metadata = {
  title: "Travel guides",
  description: "Permits, packing lists, seasons and itineraries — practical notes from our advisors.",
  alternates: { canonical: "/guides" },
};

type SP = Promise<{ category?: string }>;

export default async function GuidesPage({ searchParams }: { searchParams: SP }) {
  const { category } = await searchParams;
  const db = await getDb();
  const all = await publishedPosts(db);
  const categories = [...new Set(all.map((p) => p.category))];
  const posts = category ? all.filter((p) => p.category === category) : all;
  const [lead, ...rest] = category ? [undefined, ...posts] : [all.find((p) => p.featured) ?? all[0], ...all.filter((p) => p !== (all.find((x) => x.featured) ?? all[0]))];

  return (
    <div className="page-x container-x pb-24 pt-10 md:pt-16">
      <div className="flex flex-col justify-between gap-6 border-b border-line pb-8 md:flex-row md:items-end">
        <div className="flex flex-col gap-3">
          <p className="eyebrow">{category ? `Travel guides / ${category}` : "Travel guides"}</p>
          <h1 className="font-display text-[48px] leading-[52px] tracking-[-0.025em] text-teal md:text-[72px] md:leading-[76px]">{category ?? "Notes from the road"}</h1>
        </div>
        <p className="max-w-[380px] text-[16px] leading-[26px] text-stone">Permits, packing, seasons and honest itineraries — written by the people who plan the trips.</p>
      </div>
      <nav aria-label="Categories" className="flex flex-wrap gap-2 py-6">
        <Link href="/guides" aria-current={!category ? "page" : undefined} className={`rounded-full border px-4 py-1.5 text-[14px] ${!category ? "border-teal bg-teal text-ivory" : "border-line bg-white"}`}>All</Link>
        {categories.map((c) => (
          <Link key={c} href={`/guides?category=${encodeURIComponent(c)}`} aria-current={c === category ? "page" : undefined} className={`rounded-full border px-4 py-1.5 text-[14px] ${c === category ? "border-teal bg-teal text-ivory" : "border-line bg-white"}`}>{c}</Link>
        ))}
      </nav>
      {lead && (
        <Link href={`/guides/${lead.slug}`} className="group grid gap-8 border-b border-line pb-12 pt-4 md:grid-cols-[3fr_2fr] md:items-end">
          <Photo photo={lead.hero} className="h-[260px] md:h-[420px]" />
          <div className="flex flex-col gap-4">
            <p className="meta text-[12px]!">{lead.category} · {lead.readMinutes} min read</p>
            <h2 className="font-display text-[34px] leading-[40px] text-charcoal group-hover:text-teal md:text-[44px] md:leading-[50px]">{lead.title}</h2>
            <p className="text-[16px] leading-[26px] text-stone">{lead.excerpt}</p>
          </div>
        </Link>
      )}
      {posts.length === 0 ? (
        <p className="py-16 text-[16px] text-stone">No guides here yet. <Link href="/guides" className="underline">See all guides</Link></p>
      ) : (
        <ul className="grid gap-x-8 gap-y-12 pt-12 sm:grid-cols-2 lg:grid-cols-3">
          {rest.filter(Boolean).map((p) => (
            <li key={p!.id}>
              <Link href={`/guides/${p!.slug}`} className="group flex flex-col gap-4">
                <Photo photo={p!.hero} className="h-[220px]" />
                <p className="meta text-[12px]!">{p!.category} · {p!.readMinutes} min</p>
                <h3 className="font-display text-[24px] leading-[30px] text-charcoal group-hover:text-teal">{p!.title}</h3>
                <p className="text-[15px] leading-6 text-stone">{p!.excerpt}</p>
                <p className="text-[13px] text-stone">{formatDate(p!.publishAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
