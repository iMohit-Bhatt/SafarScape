"use client";
import { useState } from "react";
import { abtn, PubBadge, Th, Td } from "@/components/admin/ui";
import { Input, Select, Toggle, Panel, TextArea } from "@/components/admin/form";
import { formatDate } from "@/lib/format";
import { saveBannerAction, deleteBannerAction, saveOfferAction } from "../actions";
import { useSave } from "../useSave";

type B = { id: number; eyebrow: string; headline: string; subline: string; ctaLabel: string; ctaHref: string; startsAt: string | null; endsAt: string | null; priority: number; status: string };
type O = { id: number; name: string; badge: string; discountType: string; amount: number; packageIds: number[]; terms: string; validFrom: string; validTo: string; active: boolean };

const blankB = { eyebrow: "", headline: "", subline: "", ctaLabel: "See the trip", ctaHref: "/packages", startsAt: "", endsAt: "", priority: "0", status: "draft" };
const blankO = { name: "", badge: "", discountType: "flat", amount: "", packageIds: [] as number[], terms: "", validFrom: new Date().toISOString().slice(0, 10), validTo: "", active: true };

export function BannersOffers({ banners, offers, packages }: { banners: B[]; offers: O[]; packages: { id: number; title: string }[] }) {
  const { run, pending, errors } = useSave();
  const [b, setB] = useState<typeof blankB | null>(null);
  const [bId, setBId] = useState<number | null>(null);
  const [o, setO] = useState<typeof blankO | null>(null);
  const [oId, setOId] = useState<number | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between"><h2 className="text-[18px] font-medium">Banners</h2><button type="button" className={abtn.primary} onClick={() => { setBId(null); setB(blankB); }}>+ New banner</button></div>
        {b && (
          <Panel title={bId ? "Edit banner" : "New banner"}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Eyebrow" value={b.eyebrow} onChange={(v) => setB({ ...b, eyebrow: v })} max={40} />
              <Input label="Headline" value={b.headline} onChange={(v) => setB({ ...b, headline: v })} max={90} error={errors.headline} />
              <Input label="Button label" value={b.ctaLabel} onChange={(v) => setB({ ...b, ctaLabel: v })} error={errors.ctaLabel} />
              <Input label="Button link" value={b.ctaHref} onChange={(v) => setB({ ...b, ctaHref: v })} error={errors.ctaHref} hint="A site path like /packages/kashmir-5n6d" />
              <Input label="Starts" type="date" value={b.startsAt} onChange={(v) => setB({ ...b, startsAt: v })} />
              <Input label="Ends" type="date" value={b.endsAt} onChange={(v) => setB({ ...b, endsAt: v })} error={errors.endsAt} />
              <Select label="Status" value={b.status} onChange={(v) => setB({ ...b, status: v })} options={[["draft", "Draft"], ["scheduled", "Scheduled (shows between dates)"], ["live", "Live"]]} />
              <Input label="Priority" type="number" value={b.priority} onChange={(v) => setB({ ...b, priority: v })} />
            </div>
            <div className="rounded-[4px] bg-teal px-4 py-2.5 text-center text-[14px] text-ivory"><span className="mr-3 text-[12px] uppercase tracking-[0.12em] text-gold">{b.eyebrow}</span>{b.headline || "Headline"} <u>{b.ctaLabel} →</u></div>
            <div className="flex gap-2"><button type="button" disabled={pending} className={abtn.primary} onClick={() => run(() => saveBannerAction(bId, b), () => setB(null))}>Save banner</button><button type="button" className={abtn.secondary} onClick={() => setB(null)}>Cancel</button></div>
          </Panel>
        )}
        <div className="overflow-x-auto rounded-[8px] border border-line bg-white">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-line"><tr><Th>Headline</Th><Th>Link</Th><Th>Dates</Th><Th>Priority</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {banners.map((x) => (
                <tr key={x.id} className="border-b border-line last:border-0">
                  <Td><span className="block text-[12px] text-stone">{x.eyebrow}</span>{x.headline}</Td>
                  <Td className="text-stone">{x.ctaHref}</Td>
                  <Td>{x.startsAt ?? "—"} → {x.endsAt ?? "—"}</Td>
                  <Td>{x.priority}</Td>
                  <Td><PubBadge status={x.status} /></Td>
                  <Td className="text-right">
                    <span className="inline-flex gap-2">
                      <button type="button" className={abtn.small} onClick={() => { setBId(x.id); setB({ ...x, startsAt: x.startsAt ?? "", endsAt: x.endsAt ?? "", priority: String(x.priority) }); }}>Edit</button>
                      <button type="button" className={abtn.small} disabled={pending} onClick={() => confirm("Delete this banner?") && run(() => deleteBannerAction(x.id))}>Delete</button>
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between"><h2 className="text-[18px] font-medium">Offers</h2><button type="button" className={abtn.primary} onClick={() => { setOId(null); setO(blankO); }}>+ New offer</button></div>
        {o && (
          <Panel title={oId ? "Edit offer" : "New offer"} subtitle="Shown as a badge on package cards and as a discounted “from” price.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Name" value={o.name} onChange={(v) => setO({ ...o, name: v })} error={errors.name} />
              <Input label="Badge text" value={o.badge} onChange={(v) => setO({ ...o, badge: v })} max={24} error={errors.badge} placeholder="₹4,000 OFF" />
              <div className="grid grid-cols-2 gap-2">
                <Select label="Type" value={o.discountType} onChange={(v) => setO({ ...o, discountType: v })} options={[["flat", "₹ off"], ["percent", "% off"]]} />
                <Input label="Amount" value={o.amount} onChange={(v) => setO({ ...o, amount: v })} error={errors.amount} />
              </div>
              <Input label="Valid from" type="date" value={o.validFrom} onChange={(v) => setO({ ...o, validFrom: v })} error={errors.validFrom} />
              <Input label="Valid to" type="date" value={o.validTo} onChange={(v) => setO({ ...o, validTo: v })} error={errors.validTo} />
              <div className="pt-6"><Toggle label="Active" checked={o.active} onChange={(v) => setO({ ...o, active: v })} /></div>
            </div>
            <TextArea label="Terms (shown on the package page)" rows={2} value={o.terms} onChange={(v) => setO({ ...o, terms: v })} />
            <div className="flex flex-col gap-2">
              <span className="text-[14px] font-medium">Applies to</span>
              <div className="flex flex-wrap gap-2">
                {packages.map((p) => { const on = o.packageIds.includes(p.id); return <button key={p.id} type="button" aria-pressed={on} onClick={() => setO({ ...o, packageIds: on ? o.packageIds.filter((x) => x !== p.id) : [...o.packageIds, p.id] })} className={`rounded-full border px-3 py-1 text-[13px] ${on ? "border-teal bg-info-bg text-teal" : "border-line"}`}>{p.title}</button>; })}
              </div>
            </div>
            <div className="flex gap-2"><button type="button" disabled={pending} className={abtn.primary} onClick={() => run(() => saveOfferAction(oId, o), () => setO(null))}>Save offer</button><button type="button" className={abtn.secondary} onClick={() => setO(null)}>Cancel</button></div>
          </Panel>
        )}
        <div className="overflow-x-auto rounded-[8px] border border-line bg-white">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-line"><tr><Th>Offer</Th><Th>Discount</Th><Th>Packages</Th><Th>Valid</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {offers.map((x) => {
                const live = x.active && x.validFrom <= today && x.validTo >= today;
                return (
                  <tr key={x.id} className="border-b border-line last:border-0">
                    <Td><span className="mr-2 rounded-[2px] bg-terracotta px-1.5 py-0.5 text-[11px] text-ivory">{x.badge}</span>{x.name}</Td>
                    <Td>{x.discountType === "flat" ? `₹${x.amount.toLocaleString("en-IN")}` : `${x.amount}%`}</Td>
                    <Td>{x.packageIds.length}</Td>
                    <Td>{formatDate(x.validFrom)} – {formatDate(x.validTo)}</Td>
                    <Td><PubBadge status={live ? "live" : x.active ? "scheduled" : "draft"} /></Td>
                    <Td className="text-right"><button type="button" className={abtn.small} onClick={() => { setOId(x.id); setO({ ...x, amount: String(x.amount) }); }}>Edit</button></Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
