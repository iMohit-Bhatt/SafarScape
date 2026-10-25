"use client";
import Link from "next/link";
import { btn } from "@/components/ui/buttons";

export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page-x container-x flex flex-col items-start gap-6 py-24 md:py-36">
      <p className="eyebrow">500 — Something went wrong</p>
      <h1 className="max-w-[760px] font-display text-[44px] leading-[48px] text-teal md:text-[72px] md:leading-[76px]">That&apos;s on us, not you.</h1>
      <p className="max-w-[520px] text-[17px] leading-[28px] text-charcoal">The page didn&apos;t load properly. Try again in a moment — if you were sending an enquiry, nothing was lost on your side.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={reset} className={btn.primary}>Try again</button>
        <Link href="/contact" className={btn.secondary}>Contact us</Link>
      </div>
    </div>
  );
}
