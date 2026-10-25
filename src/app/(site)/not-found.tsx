import Link from "next/link";
import { btn } from "@/components/ui/buttons";

export default function NotFound() {
  return (
    <div className="page-x container-x flex flex-col items-start gap-6 py-24 md:py-36">
      <p className="eyebrow">404 — Page not found</p>
      <h1 className="max-w-[760px] font-display text-[48px] leading-[52px] text-teal md:text-[80px] md:leading-[84px]">This road doesn&apos;t go anywhere.</h1>
      <p className="max-w-[520px] text-[17px] leading-[28px] text-charcoal">The page may have moved, or the trip may no longer run. Try the packages, or tell us where you wanted to go.</p>
      <form action="/search" role="search" className="flex w-full max-w-[520px] gap-3">
        <input name="q" aria-label="Search" placeholder="Search trips and places" className="field-input" />
        <button className={btn.primarySm}>Search</button>
      </form>
      <div className="flex flex-wrap gap-3">
        <Link href="/packages" className={btn.secondary}>All packages</Link>
        <Link href="/" className={btn.secondary}>Home</Link>
      </div>
    </div>
  );
}
