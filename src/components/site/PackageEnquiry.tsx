"use client";
import { useEffect, useState } from "react";
import { EnquiryDialog, type EnquiryContext } from "./EnquiryDialog";
import { btn } from "@/components/ui/buttons";
import { WhatsAppIcon } from "@/components/ui/icons";
import { track } from "./analytics-client";
import { formatINR } from "@/lib/format";

type Dep = { id: number; label: string; seatsLeft: number; price: number; status: string };

export function PackageEnquiry({
  ctx,
  price,
  basePrice,
  priceNote,
  offerTerms,
  departures,
  whatsappHref,
}: {
  ctx: EnquiryContext;
  price: number;
  basePrice: number;
  priceNote: string;
  offerTerms?: string | null;
  departures: Dep[];
  whatsappHref: string | null;
}) {
  const open = departures.filter((d) => d.status === "open");
  const [dep, setDep] = useState<number | null>(open[0]?.id ?? null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [show, setShow] = useState(false);

  // "Enquire →" links in the departures table open the dialog with that departure selected.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-enquire]");
      if (!el) return;
      e.preventDefault();
      const id = el.dataset.enquire;
      setDep(id && id !== "own" ? Number(id) : null);
      setShow(true);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const card = (
    <div className="flex flex-col gap-5 rounded-[8px] border border-line bg-white p-6 md:p-7">
      <div>
        <p className="text-[13px] text-stone">Starting from</p>
        <p className="flex items-baseline gap-2">
          <span className="font-display text-[44px] leading-[52px] text-teal" data-testid="price">{formatINR(price)}</span>
          {price !== basePrice && <s className="text-[15px] text-stone">{formatINR(basePrice)}</s>}
          <span className="text-[14px] text-stone">per person</span>
        </p>
        <p className="mt-1 text-[13px] leading-5 text-stone">{priceNote} Final price depends on dates and hotel category.</p>
      </div>
      {offerTerms && (
        <p className="flex gap-2 rounded-[4px] bg-danger-bg px-3.5 py-2.5 text-[13px] leading-5 text-terracotta">
          <span aria-hidden>•</span> {offerTerms}
        </p>
      )}
      <label className="flex flex-col gap-1 rounded-[4px] border border-line px-3.5 py-2.5">
        <span className="text-[11px] tracking-[0.12em] text-stone uppercase">Departure</span>
        <select className="bg-transparent text-[15px] text-charcoal outline-none" value={dep ?? ""} onChange={(e) => setDep(e.target.value ? Number(e.target.value) : null)}>
          <option value="">My own dates</option>
          {open.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label} · {d.seatsLeft} seats left
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2.5">
        {(
          [
            ["Adults", adults, setAdults, 1],
            ["Children", children, setChildren, 0],
          ] as const
        ).map(([label, v, set, min]) => (
          <label key={label} className="flex flex-col gap-1 rounded-[4px] border border-line px-3.5 py-2.5">
            <span className="text-[11px] tracking-[0.12em] text-stone uppercase">{label}</span>
            <input type="number" min={min} max={40} value={v} onChange={(e) => set(Math.max(min, Math.min(40, Number(e.target.value) || min)))} className="bg-transparent text-[15px] text-charcoal outline-none" />
          </label>
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        <button type="button" className={`${btn.primary} py-3.5 text-[15px]`} onClick={() => setShow(true)}>
          Enquire about this trip
        </button>
        {whatsappHref && (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={btn.whatsapp} onClick={() => track("whatsapp_click", { placement: "package_card", package_name: ctx.title })}>
            <WhatsAppIcon /> Ask on WhatsApp
          </a>
        )}
      </div>
      <p className="text-center text-[12px] leading-[18px] text-stone">An advisor calls you back. Nothing is booked or charged online.</p>
    </div>
  );

  return (
    <>
      {card}
      {/* Mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-white px-4 py-3 lg:hidden">
        <div className="flex flex-1 flex-col">
          <span className="text-[12px] text-stone">from</span>
          <span className="font-display text-[22px] leading-[26px] text-teal">{formatINR(price)}</span>
        </div>
        {whatsappHref && (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Ask on WhatsApp" className="rounded-[4px] border border-whatsapp p-3 text-whatsapp">
            <WhatsAppIcon className="h-5 w-5" />
          </a>
        )}
        <button type="button" className={`${btn.primarySm}`} onClick={() => setShow(true)}>
          Enquire
        </button>
      </div>
      <EnquiryDialog
        ctx={ctx}
        open={show}
        onClose={() => setShow(false)}
        whatsappHref={whatsappHref}
        initialDepartureId={dep}
        initialAdults={adults}
        initialChildren={children}
      />
    </>
  );
}
