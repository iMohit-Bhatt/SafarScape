import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { approvedTestimonials } from "@/lib/catalogue";
import { btn } from "@/components/ui/buttons";

export const metadata: Metadata = { title: "Reviews", description: "What travellers say after their Safarscape trips.", alternates: { canonical: "/reviews" } };

export default async function ReviewsPage() {
  const reviews = await approvedTestimonials(await getDb());
  const anyDemo = reviews.some((r) => r.isDemo);
  return (
    <div className="page-x container-x pb-24 pt-10 md:pt-16">
      <div className="flex flex-col justify-between gap-6 border-b border-line pb-8 md:flex-row md:items-end">
        <div className="flex flex-col gap-3">
          <p className="eyebrow">Reviews</p>
          <h1 className="font-display text-[48px] leading-[52px] tracking-[-0.025em] text-teal md:text-[72px] md:leading-[76px]">In their words</h1>
        </div>
        <p className="max-w-[420px] text-[15px] leading-6 text-stone">
          We only publish reviews travellers have agreed to share, and we never edit what they wrote. Each one is marked with where it came from.
        </p>
      </div>
      {anyDemo && (
        <p className="mt-6 rounded-[4px] bg-warning-bg px-4 py-3 text-[14px] text-warning">
          Sample content — these placeholder reviews are replaced with real, consented traveller reviews before launch.
        </p>
      )}
      {reviews.length === 0 ? (
        <p className="py-16 text-[16px] text-stone">Reviews will appear here after our first trips this season.</p>
      ) : (
        <ul className="grid gap-6 pt-10 md:grid-cols-2">
          {reviews.map((r) => (
            <li key={r.id} className="flex flex-col gap-5 border border-line bg-white p-7">
              <p aria-label={`${r.rating} out of 5`} className="text-[16px] tracking-[0.2em] text-gold">{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span></p>
              <blockquote className="font-display text-[22px] leading-[31px] text-teal">&ldquo;{r.quote}&rdquo;</blockquote>
              <div className="mt-auto flex items-end justify-between gap-4 border-t border-line pt-4 text-[14px]">
                <div>
                  <p className="text-charcoal">{r.name}</p>
                  <p className="text-stone">{r.trip}</p>
                </div>
                <span className="rounded-full bg-admin-bg px-2.5 py-1 text-[12px] text-stone">
                  {r.isDemo ? "Sample" : r.source === "google" ? "Google review" : r.source === "editorial" ? "Editorial" : r.verified ? "Verified traveller" : "Traveller"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-16 flex flex-col items-start justify-between gap-5 bg-sand px-6 py-8 md:flex-row md:items-center md:px-9">
        <h2 className="font-display text-[30px] text-teal">Travelled with us? We&apos;d love to hear.</h2>
        <Link href="/contact" className={btn.primarySm}>Share your trip</Link>
      </div>
    </div>
  );
}
