import Link from "next/link";
import { JsonLd } from "./JsonLd";

export function Breadcrumbs({ items, light }: { items: { href?: string; label: string }[]; light?: boolean }) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return (
    <>
      <nav aria-label="Breadcrumb" className={`text-[13px] md:text-[14px] ${light ? "text-ivory/80" : "text-stone"}`}>
        <ol className="flex flex-wrap gap-1">
          {items.map((it, i) => (
            <li key={i} className="flex gap-1">
              {it.href ? <Link href={it.href} className="hover:underline">{it.label}</Link> : <span aria-current="page">{it.label}</span>}
              {i < items.length - 1 && <span aria-hidden>/</span>}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.label, ...(it.href ? { item: `${site}${it.href}` } : {}) })),
        }}
      />
    </>
  );
}
