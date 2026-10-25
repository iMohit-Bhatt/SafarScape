"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { MONTHS } from "@/lib/format";
import { CloseIcon } from "@/components/ui/icons";

type DestOpt = { slug: string; name: string; count: number };
const types = [
  ["honeymoon", "Honeymoon"],
  ["family", "Family"],
  ["adventure", "Adventure"],
  ["pilgrimage", "Pilgrimage"],
  ["group", "Group"],
] as const;
const durations = [
  ["short", "Up to 4 nights"],
  ["mid", "5 – 7 nights"],
  ["long", "8 nights or more"],
] as const;

function useParamsState() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const list = (k: string) => (sp.get(k) ?? "").split(",").filter(Boolean);
  const set = (updates: Record<string, string | string[] | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(updates)) {
      const val = Array.isArray(v) ? v.join(",") : v;
      if (val) next.set(k, val);
      else next.delete(k);
    }
    next.delete("page");
    start(() => router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  return { sp, list, set, pending };
}

export function FilterPanel({ dests, onDone }: { dests: DestOpt[]; onDone?: () => void }) {
  const { sp, list, set } = useParamsState();
  const [showAll, setShowAll] = useState(false);
  const [destQ, setDestQ] = useState("");
  const [min, setMin] = useState(sp.get("min") ?? "");
  const [max, setMax] = useState(sp.get("max") ?? "");
  const spKey = sp.toString();
  const [prevKey, setPrevKey] = useState(spKey);
  if (spKey !== prevKey) {
    setPrevKey(spKey);
    setMin(sp.get("min") ?? "");
    setMax(sp.get("max") ?? "");
  }
  const selDest = list("dest");
  const selType = list("type");
  const selMonth = list("month");
  const toggle = (key: string, cur: string[], v: string) => set({ [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  const visible = dests.filter((d) => d.name.toLowerCase().includes(destQ.toLowerCase()));
  const shown = showAll || destQ ? visible : visible.slice(0, 4);
  const applyPrice = () => set({ min: min.replace(/\D/g, "") || null, max: max.replace(/\D/g, "") || null });

  return (
    <div className="flex flex-col">
      <div role="group" className="flex flex-col gap-3 border-b border-line pb-8">
        <p className="eyebrow mb-1">Destination</p>
        <input className="field-input" placeholder="Search Kashmir, Bali…" aria-label="Search destinations" value={destQ} onChange={(e) => setDestQ(e.target.value)} />
        <div className="flex flex-col gap-2.5 pt-1">
          {shown.map((d) => (
            <label key={d.slug} className="flex items-center gap-2.5 text-[15px] text-charcoal">
              <input type="checkbox" className="h-4 w-4 accent-teal" checked={selDest.includes(d.slug)} onChange={() => toggle("dest", selDest, d.slug)} />
              {d.name} ({d.count})
            </label>
          ))}
        </div>
        {!destQ && visible.length > 4 && (
          <button type="button" className="self-start text-[14px] font-medium text-teal" onClick={() => setShowAll((s) => !s)}>
            {showAll ? "Show fewer" : `Show ${visible.length - 4} more`}
          </button>
        )}
      </div>
      <div role="group" className="flex flex-col gap-4 border-b border-line py-8">
        <p className="eyebrow mb-1">Trip type</p>
        <div className="flex flex-wrap gap-2">
          {types.map(([v, l]) => {
            const on = selType.includes(v);
            return (
              <button key={v} type="button" aria-pressed={on} onClick={() => toggle("type", selType, v)} className={`rounded-full border px-3.5 py-1.5 text-[14px] ${on ? "border-teal bg-info-bg text-teal" : "border-line bg-white text-charcoal"}`}>
                {l}
                {on && " ✓"}
              </button>
            );
          })}
        </div>
      </div>
      <div role="group" className="flex flex-col gap-4 border-b border-line py-8">
        <p className="eyebrow mb-1">Price per person</p>
        <form className="flex gap-2.5" onSubmit={(e) => { e.preventDefault(); applyPrice(); }}>
          <input className="field-input" inputMode="numeric" placeholder="₹ Min" aria-label="Minimum price" value={min} onChange={(e) => setMin(e.target.value)} onBlur={applyPrice} />
          <input className="field-input" inputMode="numeric" placeholder="₹ Max" aria-label="Maximum price" value={max} onChange={(e) => setMax(e.target.value)} onBlur={applyPrice} />
        </form>
      </div>
      <div role="group" className="flex flex-col gap-2.5 border-b border-line py-8">
        <p className="eyebrow mb-1">Duration</p>
        {durations.map(([v, l]) => (
          <label key={v} className="flex items-center gap-2.5 text-[15px] text-charcoal">
            <input type="radio" name="dur" className="h-4 w-4 accent-teal" checked={sp.get("dur") === v} onChange={() => set({ dur: v })} onClick={() => sp.get("dur") === v && set({ dur: null })} />
            {l}
          </label>
        ))}
      </div>
      <div role="group" className="flex flex-col gap-4 py-8">
        <p className="eyebrow mb-1">Travel month</p>
        <div className="grid grid-cols-4 gap-1.5">
          {MONTHS.map((m, i) => {
            const v = String(i + 1);
            const on = selMonth.includes(v);
            return (
              <button key={m} type="button" aria-pressed={on} onClick={() => toggle("month", selMonth, v)} className={`rounded-[2px] border py-2 text-[14px] ${on ? "border-teal bg-teal text-ivory" : "border-line bg-white text-charcoal"}`}>
                {m}
              </button>
            );
          })}
        </div>
      </div>
      {onDone && (
        <button type="button" onClick={onDone} className="rounded-[4px] bg-teal py-4 text-[16px] font-medium text-ivory">
          Show results
        </button>
      )}
    </div>
  );
}

export function SortSelect() {
  const { sp, set } = useParamsState();
  return (
    <label className="flex items-center gap-3 text-[14px] text-stone">
      <span className="hidden sm:inline">Sort</span>
      <select aria-label="Sort packages" className="rounded-[4px] border border-line bg-white px-3.5 py-2.5 text-[15px] text-charcoal" value={sp.get("sort") ?? "popular"} onChange={(e) => set({ sort: e.target.value === "popular" ? null : e.target.value })}>
        <option value="popular">Most popular</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
        <option value="duration">Shortest first</option>
      </select>
    </label>
  );
}

export function ActiveChips({ chips }: { chips: { key: string; value?: string; label: string }[] }) {
  const { list, set } = useParamsState();
  if (!chips.length) return null;
  return (
    <>
      {chips.map((c) => (
        <button
          key={`${c.key}-${c.value ?? ""}`}
          type="button"
          onClick={() => (c.value ? set({ [c.key]: list(c.key).filter((x) => x !== c.value) }) : set(c.key === "price" ? { min: null, max: null, budget: null } : { [c.key]: null }))}
          className="rounded-full bg-info-bg px-3 py-1.5 text-[14px] text-teal"
          aria-label={`Remove filter ${c.label}`}
        >
          {c.label} ×
        </button>
      ))}
      <button type="button" className="link-underline text-[14px] font-medium text-charcoal" onClick={() => set({ dest: null, type: null, min: null, max: null, dur: null, month: null, q: null, budget: null })}>
        Clear all
      </button>
    </>
  );
}

export function MobileFilterButton({ dests, count }: { dests: DestOpt[]; count: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-[4px] border border-line bg-white px-4 py-2.5 text-[15px] lg:hidden">
        Filters{count ? ` · ${count}` : ""}
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Filters" className="fixed inset-0 z-50 overflow-y-auto bg-ivory px-5 pb-8 lg:hidden">
          <div className="sticky top-0 z-10 -mx-5 mb-4 flex items-center justify-between border-b border-line bg-ivory px-5 py-4">
            <span className="font-display text-[26px] text-teal">Filters</span>
            <button type="button" aria-label="Close filters" onClick={() => setOpen(false)}>
              <CloseIcon className="h-6 w-6" />
            </button>
          </div>
          <FilterPanel dests={dests} onDone={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
