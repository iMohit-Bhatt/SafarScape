"use client";
import { useState } from "react";
import { abtn, PubBadge } from "@/components/admin/ui";
import { Input, TextArea, Select, Toggle, Panel } from "@/components/admin/form";
import { moderateAction, saveTestimonialAction } from "../actions";
import { useSave } from "../useSave";

type T = { id: number; name: string; trip: string; quote: string; rating: number; source: string; consent: boolean; verified: boolean; isDemo: boolean; status: string; showOnHome: boolean; createdAt: string };

export function TestimonialsBoard({ items }: { items: T[] }) {
  const { run, pending, errors } = useSave();
  const [filter, setFilter] = useState("pending");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", trip: "", quote: "", rating: "5", source: "traveller", consent: false, verified: false });
  const list = items.filter((t) => filter === "all" || t.status === filter);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {["pending", "approved", "rejected", "all"].map((s) => (
            <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)} className={`rounded-full border px-3.5 py-1.5 text-[14px] capitalize ${filter === s ? "border-teal bg-teal text-ivory" : "border-line bg-white"}`}>
              {s} ({s === "all" ? items.length : items.filter((t) => t.status === s).length})
            </button>
          ))}
        </div>
        <button type="button" className={abtn.primary} onClick={() => setAdding((a) => !a)}>{adding ? "Close" : "+ Add review"}</button>
      </div>
      {adding && (
        <Panel title="Add a review" subtitle="Paste exactly what the traveller wrote. It stays pending until approved.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name as they want it shown" value={f.name} onChange={(v) => setF({ ...f, name: v })} error={errors.name} />
            <Input label="Trip" value={f.trip} onChange={(v) => setF({ ...f, trip: v })} placeholder="Kashmir · Honeymoon" error={errors.trip} />
          </div>
          <TextArea label="Their words" value={f.quote} onChange={(v) => setF({ ...f, quote: v })} error={errors.quote} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Rating" value={f.rating} onChange={(v) => setF({ ...f, rating: v })} options={[["5", "5 ★"], ["4", "4 ★"], ["3", "3 ★"], ["2", "2 ★"], ["1", "1 ★"]]} />
            <Select label="Source" value={f.source} onChange={(v) => setF({ ...f, source: v })} options={[["traveller", "Traveller (direct)"], ["google", "Google review"], ["editorial", "Editorial"]]} />
          </div>
          <Toggle label="Traveller agreed to publish this" checked={f.consent} onChange={(v) => setF({ ...f, consent: v })} />
          <Toggle label="Verified trip with us" checked={f.verified} onChange={(v) => setF({ ...f, verified: v })} />
          <div><button type="button" disabled={pending} className={abtn.primary} onClick={() => run(() => saveTestimonialAction(null, f), () => { setAdding(false); setF({ name: "", trip: "", quote: "", rating: "5", source: "traveller", consent: false, verified: false }); setFilter("pending"); })}>Save as pending</button></div>
        </Panel>
      )}
      <ul className="grid gap-4 lg:grid-cols-2">
        {list.map((t) => (
          <li key={t.id} className="flex flex-col gap-3 rounded-[8px] border border-line bg-white p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[14px] font-medium">{t.name} <span className="font-normal text-stone">· {t.trip}</span></span>
              <span className="flex gap-1.5">{t.isDemo && <span className="rounded bg-admin-bg px-2 py-0.5 text-[12px] text-stone">Sample</span>}<PubBadge status={t.status} /></span>
            </div>
            <blockquote className="font-display text-[18px] leading-[26px] text-teal">&ldquo;{t.quote}&rdquo;</blockquote>
            <p className="text-[13px] text-stone">{"★".repeat(t.rating)} · {t.source} · {t.consent ? "Consent recorded" : <span className="text-danger">No consent recorded</span>}{t.verified ? " · Verified" : ""}</p>
            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              {t.status !== "approved" && <button type="button" disabled={pending} className={abtn.small} onClick={() => run(() => moderateAction(t.id, "approve"))}>Approve</button>}
              {t.status !== "rejected" && <button type="button" disabled={pending} className={abtn.small} onClick={() => run(() => moderateAction(t.id, "reject"))}>Reject</button>}
              {t.status === "approved" && <button type="button" disabled={pending} className={abtn.small} onClick={() => run(() => moderateAction(t.id, t.showOnHome ? "home-off" : "home-on"))}>{t.showOnHome ? "Hide from homepage" : "Show on homepage"}</button>}
            </div>
          </li>
        ))}
        {list.length === 0 && <li className="text-[14px] text-stone">Nothing {filter === "all" ? "" : filter} right now.</li>}
      </ul>
    </div>
  );
}
