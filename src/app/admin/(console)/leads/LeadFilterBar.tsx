"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "@/components/ui/icons";

const sources = ["google", "instagram", "facebook", "whatsapp", "referral", "direct", "phone"];

export function LeadFilterBar({ staff, total }: { staff: { id: number; name: string }[]; total: number }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const urlQ = sp.get("q") ?? "";
  const [prevQ, setPrevQ] = useState(urlQ);
  if (urlQ !== prevQ) {
    setPrevQ(urlQ);
    setQ(urlQ);
  }
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp.toString());
    if (v) n.set(k, v);
    else n.delete(k);
    n.delete("page");
    router.push(`${pathname}?${n}`);
  };
  const sel = "rounded-[4px] border border-line bg-white px-3 py-2 text-[14px]";
  const active = ["status", "assignee", "source", "days", "q"].filter((k) => sp.get(k));
  return (
    <div className="flex flex-col gap-3 border-b border-line px-6 py-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <form className="flex min-w-[220px] flex-1 items-center gap-2 rounded-[4px] border border-line px-3 py-2 md:max-w-[260px]" onSubmit={(e) => { e.preventDefault(); set("q", q.trim()); }}>
          <SearchIcon className="h-4 w-4 text-stone" />
          <input aria-label="Search name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone or email" className="w-full bg-transparent text-[14px] outline-none" />
        </form>
        <select aria-label="Status" className={sel} value={sp.get("status") ?? ""} onChange={(e) => set("status", e.target.value)}>
          <option value="">Status</option>
          {["new", "contacted", "quoted", "converted", "lost"].map((s) => <option key={s} value={s} className="capitalize">{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select aria-label="Assignee" className={sel} value={sp.get("assignee") ?? ""} onChange={(e) => set("assignee", e.target.value)}>
          <option value="">Assignee</option>
          <option value="none">Unassigned</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select aria-label="Source" className={sel} value={sp.get("source") ?? ""} onChange={(e) => set("source", e.target.value)}>
          <option value="">Source</option>
          {sources.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select aria-label="Created" className={sel} value={sp.get("days") ?? ""} onChange={(e) => set("days", e.target.value)}>
          <option value="">Created · any time</option>
          <option value="1">Last 24 hours</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <select aria-label="Sort" className={`${sel} md:ml-auto`} value={sp.get("sort") ?? "newest"} onChange={(e) => set("sort", e.target.value === "newest" ? "" : e.target.value)}>
          <option value="newest">Sort: Newest</option>
          <option value="oldest">Sort: Oldest</option>
          <option value="followup">Sort: Next follow-up</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[14px] text-stone">
        <span data-testid="lead-count">{total} lead{total === 1 ? "" : "s"} match</span>
        {active.length > 0 && (
          <button type="button" onClick={() => { const n = new URLSearchParams(sp.toString()); active.forEach((k) => n.delete(k)); router.push(`${pathname}?${n}`); }} className="text-charcoal underline">Clear filters</button>
        )}
      </div>
    </div>
  );
}
