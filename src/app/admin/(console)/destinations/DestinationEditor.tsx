"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Photo, SeasonMonth, ThingToDo, TravelInfo, PublishStatus, Season } from "@/db/schema";
import { abtn, PubBadge } from "@/components/admin/ui";
import { Input, TextArea, LinesInput, Panel, moveItem } from "@/components/admin/form";
import { useToast } from "@/components/admin/Toast";
import { MONTHS, slugify } from "@/lib/format";
import { saveDestinationAction, destinationStatusAction } from "./actions";

export type DestDraft = {
  name: string; slug: string; region: string; tagline: string; intro: string; bestMonths: string; hero: Photo; photos: Photo[];
  highlights: string[]; seasons: SeasonMonth[]; thingsToDo: ThingToDo[]; travelInfo: TravelInfo[]; relatedSlugs: string[]; seoTitle: string; seoDescription: string;
};
const TABS = [["overview", "Overview"], ["photos", "Photos"], ["seasons", "Seasons"], ["things", "Things to do"], ["travel", "Travel info"], ["related", "Packages & related"], ["seo", "SEO"]] as const;
type Tab = (typeof TABS)[number][0];
const REGIONS = ["Himalaya", "South India", "Rajasthan & West", "Beaches & islands", "North East", "International"];

export function DestinationEditor({ id, initial, status, others, packages, canEdit, canPublish }: {
  id: number | null; initial: DestDraft; status: PublishStatus | null; others: { slug: string; name: string }[];
  packages: { id: number; title: string; status: string }[]; canEdit: boolean; canPublish: boolean;
}) {
  const [d, setD] = useState(initial);
  const [tab, setTab] = useState<Tab>("overview");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const set = <K extends keyof DestDraft>(k: K, v: DestDraft[K]) => setD((p) => ({ ...p, [k]: v }));
  const seasons: SeasonMonth[] = MONTHS.map((_, i) => d.seasons.find((s) => s.month === i + 1) ?? { month: i + 1, season: "good" as Season });

  const save = () =>
    start(async () => {
      const r = await saveDestinationAction(id, { ...d, seasons, seoTitle: d.seoTitle || null, seoDescription: d.seoDescription || null });
      if (!r.ok) { setErrors(r.fieldErrors ?? {}); toast(r.error, "error"); return; }
      setErrors({});
      toast(r.message ?? "Saved");
      if (!id && r.data) router.push(`/admin/destinations/${r.data.id}`);
      else router.refresh();
    });
  const publish = (s: PublishStatus) => start(async () => { const r = await destinationStatusAction(id!, s); toast(r.ok ? r.message! : r.error, r.ok ? "success" : "error"); router.refresh(); });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="flex flex-col gap-1.5">
          <Link href="/admin/destinations" className="text-[14px] text-stone hover:text-teal">‹ All destinations</Link>
          <div className="flex items-center gap-3"><h1 className="font-display text-[28px] text-teal">{d.name || "New destination"}</h1>{status && <PubBadge status={status} />}</div>
        </div>
        <div className="flex gap-2.5">
          {id && status === "published" && <Link href={`/destinations/${d.slug}`} target="_blank" className={abtn.secondary}>View page ↗</Link>}
          {canEdit && <button type="button" disabled={pending} className={abtn.secondary} onClick={save}>Save</button>}
          {id && canPublish && (status === "published" ? <button type="button" disabled={pending} className={abtn.secondary} onClick={() => publish("unpublished")}>Unpublish</button> : <button type="button" disabled={pending} className={abtn.primary} onClick={() => publish("published")}>Publish</button>)}
        </div>
      </div>
      <nav className="flex gap-6 overflow-x-auto border-b border-line" role="tablist">
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)} className={`shrink-0 border-b-2 pb-3 text-[15px] ${tab === k ? "border-teal font-medium text-teal" : "border-transparent"}`}>{l}</button>)}
      </nav>
      <fieldset disabled={!canEdit} className="flex max-w-[900px] flex-col gap-6">
        {tab === "overview" && (
          <Panel title="Overview">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Name" value={d.name} onChange={(v) => set("name", v)} error={errors.name} />
              <AFieldSelect label="Region" value={d.region} onChange={(v) => set("region", v)} options={REGIONS} />
            </div>
            <Input label="URL slug" prefix="/destinations/" value={d.slug} onChange={(v) => set("slug", slugify(v))} placeholder={slugify(d.name)} />
            <TextArea label="Tagline" rows={2} max={160} value={d.tagline} onChange={(v) => set("tagline", v)} />
            <TextArea label="Intro" rows={4} max={1000} value={d.intro} onChange={(v) => set("intro", v)} hint="Shown large under the hero. Required to publish." error={errors.intro} />
            <Input label="Best months (headline)" value={d.bestMonths} onChange={(v) => set("bestMonths", v)} placeholder="Dec–Feb for snow · Apr–Jun for meadows" />
            <LinesInput label="Highlights" value={d.highlights} onChange={(v) => set("highlights", v)} />
          </Panel>
        )}
        {tab === "photos" && (
          <Panel title="Photos">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Hero alt text" value={d.hero.alt} onChange={(v) => set("hero", { ...d.hero, alt: v })} error={errors["hero.alt"]} />
              <Input label="Hero caption" value={d.hero.caption ?? ""} onChange={(v) => set("hero", { ...d.hero, caption: v })} />
              <Input label="Hero image URL" value={d.hero.url ?? ""} onChange={(v) => set("hero", { ...d.hero, url: v || undefined })} />
              <Input label="Placeholder colour" value={d.hero.color} onChange={(v) => set("hero", { ...d.hero, color: v })} error={errors["hero.color"]} />
            </div>
            <div className="flex items-center justify-between border-t border-line pt-4"><span className="text-[15px] font-medium">More photos</span><button type="button" className={abtn.small} onClick={() => set("photos", [...d.photos, { color: "#DCD6C2", alt: "" }])}>+ Add</button></div>
            {d.photos.map((p, i) => (
              <div key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_120px_auto]">
                <Input label="Alt text" value={p.alt} onChange={(v) => set("photos", d.photos.map((x, j) => (j === i ? { ...x, alt: v } : x)))} />
                <Input label="Caption" value={p.caption ?? ""} onChange={(v) => set("photos", d.photos.map((x, j) => (j === i ? { ...x, caption: v } : x)))} />
                <Input label="Colour" value={p.color} onChange={(v) => set("photos", d.photos.map((x, j) => (j === i ? { ...x, color: v } : x)))} />
                <button type="button" aria-label="Remove photo" className={`${abtn.small} mb-1`} onClick={() => set("photos", d.photos.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </Panel>
        )}
        {tab === "seasons" && (
          <Panel title="When to go" subtitle="Click a month to cycle Peak → Good → Avoid. Notes show under each month.">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {seasons.map((s) => {
                const cls = s.season === "peak" ? "bg-teal text-ivory" : s.season === "good" ? "bg-[#C9D3C3]" : "border border-dashed border-line bg-white text-stone";
                return (
                  <div key={s.month} className="flex flex-col gap-1.5">
                    <button type="button" className={`flex h-16 flex-col justify-between rounded-[2px] p-2 text-left ${cls}`} onClick={() => set("seasons", seasons.map((x) => (x.month === s.month ? { ...x, season: (x.season === "peak" ? "good" : x.season === "good" ? "avoid" : "peak") as Season } : x)))}>
                      <span className="text-[14px]">{MONTHS[s.month - 1]}</span><span className="text-[10px] uppercase tracking-[0.12em]">{s.season}</span>
                    </button>
                    <input aria-label={`${MONTHS[s.month - 1]} note`} value={s.note ?? ""} placeholder="Note" onChange={(e) => set("seasons", seasons.map((x) => (x.month === s.month ? { ...x, note: e.target.value || undefined } : x)))} className="rounded-[3px] border border-line px-2 py-1 text-[12px]" />
                  </div>
                );
              })}
            </div>
          </Panel>
        )}
        {tab === "things" && (
          <Panel title="Things to do" action={<button type="button" className={abtn.small} onClick={() => set("thingsToDo", [...d.thingsToDo, { title: "", description: "" }])}>+ Add</button>}>
            {d.thingsToDo.map((t, i) => (
              <div key={i} className="flex gap-3 rounded-[4px] border border-line p-4">
                <div className="grid flex-1 gap-3">
                  <Input label="Title" value={t.title} onChange={(v) => set("thingsToDo", d.thingsToDo.map((x, j) => (j === i ? { ...x, title: v } : x)))} />
                  <TextArea label="Description" rows={2} value={t.description} onChange={(v) => set("thingsToDo", d.thingsToDo.map((x, j) => (j === i ? { ...x, description: v } : x)))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <button type="button" aria-label="Move up" className={abtn.small} onClick={() => set("thingsToDo", moveItem(d.thingsToDo, i, -1))}>↑</button>
                  <button type="button" aria-label="Remove" className={abtn.small} onClick={() => set("thingsToDo", d.thingsToDo.filter((_, j) => j !== i))}>✕</button>
                </div>
              </div>
            ))}
          </Panel>
        )}
        {tab === "travel" && (
          <Panel title="Getting there, practically" subtitle="Rules change — record when each item was last checked." action={<button type="button" className={abtn.small} onClick={() => set("travelInfo", [...d.travelInfo, { label: "", body: "", verifiedOn: new Date().toISOString().slice(0, 10) }])}>+ Add</button>}>
            {d.travelInfo.map((t, i) => (
              <div key={i} className="grid items-start gap-3 rounded-[4px] border border-line p-4 sm:grid-cols-[1fr_2fr_150px_auto]">
                <Input label="Label" value={t.label} onChange={(v) => set("travelInfo", d.travelInfo.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
                <TextArea label="Details" rows={2} value={t.body} onChange={(v) => set("travelInfo", d.travelInfo.map((x, j) => (j === i ? { ...x, body: v } : x)))} />
                <Input label="Verified on" type="date" value={t.verifiedOn ?? ""} onChange={(v) => set("travelInfo", d.travelInfo.map((x, j) => (j === i ? { ...x, verifiedOn: v } : x)))} />
                <button type="button" aria-label="Remove" className={`${abtn.small} mt-7`} onClick={() => set("travelInfo", d.travelInfo.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </Panel>
        )}
        {tab === "related" && (
          <>
            <Panel title="Packages here">
              {packages.length ? <ul className="flex flex-col gap-2">{packages.map((p) => <li key={p.id} className="flex justify-between text-[14px]"><Link href={`/admin/packages/${p.id}`} className="text-teal hover:underline">{p.title}</Link><PubBadge status={p.status} /></li>)}</ul> : <p className="text-[14px] text-stone">No packages yet. Create one from Packages.</p>}
            </Panel>
            <Panel title="Also nearby" subtitle="Up to three related destinations shown at the bottom of the page.">
              <div className="flex flex-wrap gap-2">
                {others.map((o) => {
                  const on = d.relatedSlugs.includes(o.slug);
                  return <button key={o.slug} type="button" aria-pressed={on} onClick={() => set("relatedSlugs", on ? d.relatedSlugs.filter((s) => s !== o.slug) : [...d.relatedSlugs, o.slug].slice(0, 3))} className={`rounded-full border px-3 py-1.5 text-[14px] ${on ? "border-teal bg-info-bg text-teal" : "border-line"}`}>{o.name}{on && " ✓"}</button>;
                })}
              </div>
            </Panel>
          </>
        )}
        {tab === "seo" && (
          <Panel title="SEO">
            <Input label="SEO title" max={70} value={d.seoTitle} onChange={(v) => set("seoTitle", v)} />
            <TextArea label="Meta description" max={160} rows={3} value={d.seoDescription} onChange={(v) => set("seoDescription", v)} />
          </Panel>
        )}
      </fieldset>
    </div>
  );
}

function AFieldSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="flex flex-col gap-1.5 text-[14px] font-medium">{label}
      <select className="field-input text-[15px]!" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Pick a region</option>
        {[...new Set([...options, value].filter(Boolean))].map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}
