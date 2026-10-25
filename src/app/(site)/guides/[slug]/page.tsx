import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/db";
import { postBySlug, publishedPosts, publishedPackages } from "@/lib/catalogue";
import { formatDate, slugify } from "@/lib/format";
import { Photo } from "@/components/ui/Photo";
import { PackageCard } from "@/components/site/PackageCard";
import { JsonLd } from "@/components/site/JsonLd";
import { ShareLinks } from "./ShareLinks";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await postBySlug(await getDb(), (await params).slug);
  if (!p) return { title: "Guide not found" };
  return {
    title: p.seoTitle || p.title,
    description: p.seoDescription || p.excerpt,
    alternates: { canonical: `/guides/${p.slug}` },
    openGraph: { type: "article", title: p.title, description: p.excerpt, publishedTime: p.publishAt?.toISOString() },
  };
}

function blocks(body: string) {
  return body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
}

export default async function ArticlePage({ params }: { params: Params }) {
  const db = await getDb();
  const post = await postBySlug(db, (await params).slug);
  if (!post) notFound();
  const parts = blocks(post.body);
  const headings = parts.filter((b) => b.startsWith("## ")).map((b) => b.slice(3));
  const all = await publishedPosts(db);
  const next = all.filter((p) => p.id !== post.id).slice(0, 3);
  const pkgs = (await publishedPackages(db)).filter((p) => post.relatedPackageIds.includes(p.id)).slice(0, 2);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <article className="pb-20">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          datePublished: post.publishAt?.toISOString(),
          dateModified: post.updatedAt.toISOString(),
          author: { "@type": "Organization", name: post.author },
          mainEntityOfPage: `${site}/guides/${post.slug}`,
        }}
      />
      <header className="page-x container-x flex flex-col items-center gap-5 pb-10 pt-10 text-center md:pt-16">
        <p className="eyebrow">
          <Link href="/guides">Travel guides</Link> / <Link href={`/guides?category=${encodeURIComponent(post.category)}`}>{post.category}</Link>
        </p>
        <h1 className="max-w-[900px] font-display text-[40px] leading-[44px] tracking-[-0.02em] text-teal md:text-[64px] md:leading-[68px]">{post.title}</h1>
        <p className="text-[13px] text-stone">{post.author} · Updated {formatDate(post.updatedAt)} · {post.readMinutes} min read</p>
      </header>
      <div className="page-x container-x">
        <Photo photo={post.hero} className="h-[240px] md:h-[520px]" priority />
        <p className="flex justify-between pt-2 text-[12px] text-stone"><span>{post.hero.caption ?? post.hero.alt}</span><span>Photo placeholder</span></p>
      </div>
      <div className="page-x container-x flex flex-col gap-10 pt-12 lg:flex-row lg:gap-[100px]">
        <aside className="flex flex-col gap-8 lg:sticky lg:top-6 lg:w-[200px] lg:shrink-0 lg:self-start">
          <ShareLinks title={post.title} />
          {headings.length > 0 && (
            <nav aria-label="In this guide" className="hidden flex-col gap-2 border-t border-line pt-6 lg:flex">
              <p className="eyebrow mb-1">In this guide</p>
              {headings.map((h) => (
                <a key={h} href={`#${slugify(h)}`} className="text-[13px] text-charcoal hover:text-teal">{h}</a>
              ))}
            </nav>
          )}
        </aside>
        <div className="prose-article max-w-[680px] text-charcoal">
          {parts.map((b, i) =>
            b.startsWith("## ") ? (
              <h2 key={i} id={slugify(b.slice(3))}>{b.slice(3)}</h2>
            ) : b.startsWith("> ") ? (
              <blockquote key={i}>{b.slice(2)}</blockquote>
            ) : (
              <p key={i}>{b}</p>
            ),
          )}
        </div>
      </div>
      {pkgs.length > 0 && (
        <section className="page-x container-x flex flex-col gap-8 pt-20">
          <h2 className="border-b border-line pb-4 font-display text-[32px] text-teal">Trips that go there</h2>
          <div className="grid gap-8 sm:grid-cols-2">
            {pkgs.map((p) => <PackageCard key={p.id} pkg={p} showType />)}
          </div>
        </section>
      )}
      {next.length > 0 && (
        <section className="page-x container-x flex flex-col gap-6 pt-20 md:flex-row md:gap-24">
          <h2 className="font-display text-[28px] text-teal md:w-[260px]">Read next</h2>
          <ul className="flex-1 border-t border-line">
            {next.map((p) => (
              <li key={p.id} className="border-b border-line">
                <Link href={`/guides/${p.slug}`} className="flex justify-between gap-4 py-4">
                  <span className="font-display text-[18px] text-charcoal hover:text-teal">{p.title}</span>
                  <span className="shrink-0 text-[13px] text-stone">{p.category} · {p.readMinutes} min</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
