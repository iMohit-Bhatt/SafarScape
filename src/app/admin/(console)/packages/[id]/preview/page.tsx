import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { packages } from "@/db/schema";
import { requirePageUser } from "@/lib/session";
import { packageBySlug } from "@/lib/catalogue";
import { formatINR, durationLabel, formatDateRange } from "@/lib/format";
import { PackageGallery } from "@/components/site/Gallery";
import { abtn, PubBadge } from "@/components/admin/ui";
import Link from "next/link";

export const metadata = { title: "Preview" };

/** Staff-only preview that works for drafts. */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageUser();
  const db = await getDb();
  const [row] = await db.select({ slug: packages.slug }).from(packages).where(eq(packages.id, Number((await params).id)));
  if (!row) notFound();
  const p = await packageBySlug(db, row.slug, { includeDrafts: true });
  if (!p) notFound();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between rounded-[4px] bg-warning-bg px-4 py-3 text-[14px] text-warning">
        <span className="flex items-center gap-2">Preview · <PubBadge status={p.status} /> {p.status !== "published" && "— not visible to visitors yet"}</span>
        <span className="flex gap-2">
          {p.status === "published" && <Link className={abtn.small} href={`/packages/${p.slug}`} target="_blank">Open live page</Link>}
          <Link className={abtn.small} href={`/admin/packages/${p.id}`}>Back to editor</Link>
        </span>
      </div>
      <div className="rounded-[8px] bg-ivory p-6 md:p-10">
        <p className="meta text-[12px]!">{p.destination.name} · {p.tripType}</p>
        <h1 className="mb-2 font-display text-[44px] leading-[48px] text-teal">{p.title}</h1>
        <p className="mb-6 text-[15px] text-stone">{durationLabel(p.nights)} · {p.route} · from {formatINR(p.finalPrice)} per person</p>
        <PackageGallery photos={p.photos} />
        <p className="mt-8 max-w-[760px] font-display text-[24px] leading-[34px]">{p.overview || p.summary}</p>
        <ol className="mt-8 max-w-[760px]">
          {p.itinerary.map((d) => (
            <li key={d.day} className="flex gap-8 border-b border-line py-5">
              <span className="font-display text-[28px] text-teal">{String(d.day).padStart(2, "0")}</span>
              <div><p className="font-display text-[20px]">{d.title}</p><p className="text-[15px]">{d.description}</p></div>
            </li>
          ))}
        </ol>
        {p.departures.length > 0 && <p className="mt-6 text-[14px] text-stone">Departures: {p.departures.map((d) => formatDateRange(d.startDate, d.endDate)).join(" · ")}</p>}
      </div>
    </div>
  );
}
