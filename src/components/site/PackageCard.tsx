import Link from "next/link";
import { Photo } from "@/components/ui/Photo";
import { formatINR } from "@/lib/format";
import type { PkgCard } from "@/lib/catalogue";
import { tripTypeShort } from "@/lib/catalogue";

export function OfferBadge({ text }: { text: string }) {
  return (
    <span className="absolute left-3 top-3 rounded-[2px] bg-terracotta px-2.5 py-1.5 text-[11px] tracking-[0.12em] text-ivory uppercase md:left-5 md:top-5 md:text-[12px]">
      {text}
    </span>
  );
}

export function PackageCard({ pkg, showType, heightClass = "h-[220px]" }: { pkg: PkgCard; showType?: boolean; heightClass?: string }) {
  const photo = pkg.photos[0] ?? { color: "#DCD6C2", alt: pkg.title };
  return (
    <article className="group flex flex-col gap-4">
      <Link href={`/packages/${pkg.slug}`} className="block" tabIndex={-1} aria-hidden>
        <Photo photo={photo} className={`${heightClass} transition-opacity group-hover:opacity-95`}>
          {pkg.offer && <OfferBadge text={pkg.offer.badge} />}
        </Photo>
      </Link>
      <div className="flex flex-col gap-2">
        <p className="meta text-[12px]!">
          {pkg.destination.name} · {pkg.nights} nights{showType ? ` · ${tripTypeShort[pkg.tripType]}` : ""}
        </p>
        <h3 className="font-display text-[24px] leading-[30px] text-charcoal">
          <Link href={`/packages/${pkg.slug}`} className="hover:text-teal">
            {pkg.title}
          </Link>
        </h3>
        <p className="text-[15px] text-charcoal">
          from {formatINR(pkg.finalPrice)}
          {pkg.offer && <s className="ml-2 text-[13px] text-stone">{formatINR(pkg.priceFrom)}</s>}
        </p>
      </div>
    </article>
  );
}
