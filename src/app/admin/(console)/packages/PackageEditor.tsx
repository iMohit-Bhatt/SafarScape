"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Photo, ItineraryDay, Hotel, Faq, PublishStatus } from "@/db/schema";
import { abtn, PubBadge } from "@/components/admin/ui";
import { Input, TextArea, Select, Toggle, LinesInput, Panel, moveItem } from "@/components/admin/form";
import { useToast } from "@/components/admin/Toast";
import { CheckIcon, ExternalIcon } from "@/components/ui/icons";
import { MONTHS, formatINR, slugify } from "@/lib/format";
import { savePackageAction, packageStatusAction, duplicatePackageAction } from "./actions";
import { DeparturesManager, type Dep } from "./DeparturesManager";

export type PackageDraft = {
  title: string; slug: string; destinationId: number; tripType: string; nights: number; route: string; summary: string; overview: string;
  priceFrom: number; priceNote: string; featured: boolean; travelMonths: number[]; photos: Photo[]; itinerary: ItineraryDay[]; hotels: Hotel[];
  inclusions: string[]; exclusions: string[]; faqs: Faq[]; cancellationPolicy: string; seoTitle: string; seoDescription: string;
};

const TABS = [
  ["basics", "Basics"], ["destination", "Destination & type"], ["photos", "Photos"], ["itinerary", "Itinerary"], ["hotels", "Hotels & inclusions"],
  ["departures", "Departures & pricing"], ["policy", "Policy & FAQs"], ["seo", "SEO"],
] as const;
type Tab = (typeof TABS)[number][0];

const PALETTE = ["#C7D3C0", "#DCD6C2", "#EBCFA8", "#C9D3D2", "#D8E2CF", "#E4E2DA"];

export function PackageEditor({
  id, initial, status, destinations, departures, canEdit, canPublish, siteUrl, updatedAt,
}: {
  id: number | null; initial: PackageDraft; status: PublishStatus | null; destinations: { id: number; name: string; slug: string }[];
  departures: Dep[]; canEdit: boolean; canPublish: boolean; siteUrl: string; updatedAt?: string;
}) {
  const [d, setD] = useState<PackageDraft>(initial);
  const [tab, setTab] = useState<Tab>("basics");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<null | PublishStatus>(null);
  const router = useRouter();
  const toast = useToast();
  const set = <K extends keyof PackageDraft>(k: K, v: PackageDraft[K]) => {
    setD((p) => ({ ...p, [k]: v }));
    setDirty(true);
  };
  const dest = destinations.find((x) => x.id === Number(d.destinationId));

  const sections = useMemo(() => [
    { key: "basics", label: "Basics", done: d.title.length >= 4 && !!d.summary && d.priceFrom > 0 },
    { key: "destination", label: "Destination & type", done: !!d.destinationId },
    { key: "photos", label: `Photos · ${d.photos.length} added`, done: d.photos.length > 0 && d.photos.every((p) => p.alt) },
    { key: "itinerary", label: `Itinerary · ${d.itinerary.length} days`, done: d.itinerary.length > 0 },
    { key: "hotels", label: "Hotels & inclusions", done: d.inclusions.filter(Boolean).length > 0 },
    { key: "departures", label: `Departures · ${departures.filter((x) => x.status === "open").length} open`, done: true },
    { key: "policy", label: `FAQs · ${d.faqs.length} questions`, done: d.faqs.length > 0 },
    { key: "policy", label: "Cancellation policy", done: !!d.cancellationPolicy },
    { key: "seo", label: "SEO description", done: !!d.seoDescription },
  ], [d, departures]);
  const doneCount = sections.filter((s) => s.done).length;

  const payload = () => ({
    ...d,
    destinationId: Number(d.destinationId),
    nights: Number(d.nights),
    priceFrom: Number(String(d.priceFrom).replace(/\D/g, "")) || 0,
    inclusions: d.inclusions.filter(Boolean),
    exclusions: d.exclusions.filter(Boolean),
    seoTitle: d.seoTitle || null,
    seoDescription: d.seoDescription || null,
  });

  const save = (then?: (id: number) => void) =>
    start(async () => {
      const r = await savePackageAction(id, payload());
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        toast(r.error, "error");
        const first = Object.keys(r.fieldErrors ?? {})[0] ?? "";
        const map: Record<string, Tab> = { title: "basics", summary: "basics", priceFrom: "basics", nights: "basics", destinationId: "destination", tripType: "destination", photos: "photos", itinerary: "itinerary", seoTitle: "seo", seoDescription: "seo" };
        const t = map[first.split(".")[0]];
        if (t) setTab(t);
        return;
      }
      setErrors({});
      setDirty(false);
      toast(r.message ?? "Saved");
      if (!id && r.data) router.push(`/admin/packages/${r.data.id}`);
      else router.refresh();
      if (r.data) then?.(r.data.id);
    });

  const changeStatus = (s: PublishStatus) =>
    start(async () => {
      if (dirty) {
        const saved = await savePackageAction(id, payload());
        if (!saved.ok) {
          setErrors(saved.fieldErrors ?? {});
          toast(saved.error, "error");
          return;
        }
        setDirty(false);
      }
      const r = await packageStatusAction(id!, s);
      toast(r.ok ? r.message ?? "Updated" : r.error, r.ok ? "success" : "error");
      if (!r.ok) setErrors({ form: r.fieldErrors?.form ? `${r.error} ${r.fieldErrors.form}` : r.error });
      setConfirm(null);
      router.refresh();
    });

  const ro = !canEdit;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="flex flex-col gap-1.5">
          <Link href="/admin/packages" className="text-[14px] text-stone hover:text-teal">‹ All packages</Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[28px] leading-[34px] text-teal">{d.title || "New package"}</h1>
            {status && <PubBadge status={status} />}
          </div>
          <p className="flex items-center gap-1.5 text-[14px] text-stone">
            {dirty ? "Unsaved changes" : updatedAt ? <><CheckIcon className="h-3.5 w-3.5" /> Saved</> : "Not saved yet"}
            {dest && <> · {dest.name}</>} · {d.tripType} · {d.nights}N/{Number(d.nights) + 1}D
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {id && <Link href={`/admin/packages/${id}/preview`} target="_blank" className={abtn.secondary}>Preview <ExternalIcon /></Link>}
          {id && canEdit && <button type="button" className={abtn.secondary} disabled={pending} onClick={() => start(async () => { const r = await duplicatePackageAction(id); toast(r.ok ? r.message! : r.error, r.ok ? "success" : "error"); if (r.ok && r.data) router.push(`/admin/packages/${r.data.id}`); })}>Duplicate</button>}
          {canEdit && <button type="button" className={abtn.secondary} disabled={pending} onClick={() => save()}>{status === "published" ? "Save changes" : "Save draft"}</button>}
          {id && canPublish && status !== "published" && <button type="button" className={abtn.primary} disabled={pending} onClick={() => setConfirm("published")}>Publish</button>}
          {id && canPublish && status === "published" && <button type="button" className={abtn.secondary} disabled={pending} onClick={() => setConfirm("unpublished")}>Unpublish</button>}
        </div>
      </div>
      {ro && <p className="rounded-[4px] bg-warning-bg px-4 py-2.5 text-[14px] text-warning">Your role can view packages but not change them.</p>}
      {errors.form && <p role="alert" className="rounded-[4px] bg-danger-bg px-4 py-2.5 text-[14px] text-danger">{errors.form}</p>}

      <nav className="flex gap-6 overflow-x-auto border-b border-line" role="tablist" aria-label="Package sections">
        {TABS.map(([k, l]) => {
          const missing = sections.some((s) => s.key === k && !s.done);
          return (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex shrink-0 items-center gap-1.5 border-b-2 pb-3 text-[15px] ${tab === k ? "border-teal font-medium text-teal" : "border-transparent text-charcoal"}`}>
              {l}{missing && <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-label="incomplete" />}
            </button>
          );
        })}
      </nav>

      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <fieldset disabled={ro} className="flex min-w-0 flex-col gap-6">
          {tab === "basics" && (
            <>
              <Panel title="Package details" subtitle="Shown at the top of the public package page and on listing cards.">
                <Input label="Package title" value={d.title} onChange={(v) => set("title", v)} error={errors.title} max={120} />
                <Input label="URL slug" prefix={`${siteUrl.replace(/^https?:\/\//, "")}/packages/`} value={d.slug} onChange={(v) => set("slug", slugify(v))} placeholder={slugify(`${dest?.slug ?? ""}-${d.title}`)} hint={status === "published" ? "Changing the slug of a live package breaks old links." : "Leave blank to generate from the title."} />
                <TextArea label="Short summary" value={d.summary} onChange={(v) => set("summary", v)} max={160} rows={2} error={errors.summary} hint="Used on package cards and as the fallback meta description." />
              </Panel>
              <Panel title="Overview" subtitle="The opening paragraph on the package page. The first sentence is shown large.">
                <TextArea label="Overview" value={d.overview} onChange={(v) => set("overview", v)} rows={6} max={5000} />
              </Panel>
              <Panel title="Duration & starting price">
                <div className="grid gap-4 sm:grid-cols-4">
                  <Input label="Nights" type="number" value={d.nights} onChange={(v) => set("nights", Number(v))} error={errors.nights} />
                  <Input label="Days" value={`${Number(d.nights) + 1} (auto)`} onChange={() => {}} />
                  <Input label="Starting price per person" prefix="₹" value={d.priceFrom} onChange={(v) => set("priceFrom", Number(v.replace(/\D/g, "")) || 0)} error={errors.priceFrom} hint={departures.length ? `Lowest open departure: ${formatINR(Math.min(...departures.map((x) => x.price)))}` : undefined} />
                  <Input label="Price note" value={d.priceNote} onChange={(v) => set("priceNote", v)} />
                </div>
                <div className="border-t border-line pt-5">
                  <Toggle label="Feature on homepage" hint="Shows in “Trips our advisors keep recommending”." checked={d.featured} onChange={(v) => set("featured", v)} />
                </div>
              </Panel>
            </>
          )}

          {tab === "destination" && (
            <Panel title="Destination & trip type">
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Destination" value={d.destinationId} onChange={(v) => set("destinationId", Number(v))} options={[[0, "Pick a destination"], ...destinations.map((x) => [x.id, x.name] as [number, string])]} error={errors.destinationId} />
                <Select label="Trip type" value={d.tripType} onChange={(v) => set("tripType", v)} options={[["honeymoon", "Honeymoon"], ["family", "Family"], ["adventure", "Adventure"], ["pilgrimage", "Pilgrimage"], ["group", "Group tour"]]} error={errors.tripType} />
              </div>
              <Input label="Route" value={d.route} onChange={(v) => set("route", v)} placeholder="Srinagar → Gulmarg → Pahalgam" />
              <div className="flex flex-col gap-2">
                <span className="text-[14px] font-medium">Good months to travel</span>
                <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
                  {MONTHS.map((m, i) => {
                    const on = d.travelMonths.includes(i + 1);
                    return <button key={m} type="button" aria-pressed={on} onClick={() => set("travelMonths", on ? d.travelMonths.filter((x) => x !== i + 1) : [...d.travelMonths, i + 1].sort((a, b) => a - b))} className={`rounded-[3px] border py-2 text-[13px] ${on ? "border-teal bg-teal text-ivory" : "border-line"}`}>{m}</button>;
                  })}
                </div>
                <p className="text-[13px] text-stone">Used by the “Travel month” filter on the packages page.</p>
              </div>
            </Panel>
          )}

          {tab === "photos" && (
            <Panel title="Photos" subtitle="The first photo is the cover. Paste an image URL, or keep the colour placeholder until real photos arrive." action={<button type="button" className={abtn.small} onClick={() => set("photos", [...d.photos, { color: PALETTE[d.photos.length % PALETTE.length], alt: "", caption: "" }])}>+ Add photo</button>}>
              {errors.photos && <p role="alert" className="text-[13px] text-danger">{errors.photos}</p>}
              {d.photos.length === 0 && <p className="text-[14px] text-stone">No photos yet. Packages need at least one before publishing.</p>}
              <ul className="flex flex-col gap-4">
                {d.photos.map((p, i) => (
                  <li key={i} className="grid gap-3 rounded-[4px] border border-line p-4 sm:grid-cols-[96px_1fr_auto]">
                    <span className="h-[72px] w-24 rounded-[2px] bg-cover bg-center" style={{ backgroundColor: p.color, backgroundImage: p.url ? `url(${p.url})` : undefined }} aria-hidden />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input label={`Alt text${i === 0 ? " (cover)" : ""}`} value={p.alt} onChange={(v) => set("photos", d.photos.map((x, j) => (j === i ? { ...x, alt: v } : x)))} error={errors[`photos.${i}.alt`]} placeholder="Describe the photo for screen readers" />
                      <Input label="Caption" value={p.caption ?? ""} onChange={(v) => set("photos", d.photos.map((x, j) => (j === i ? { ...x, caption: v } : x)))} />
                      <Input label="Image URL" value={p.url ?? ""} onChange={(v) => set("photos", d.photos.map((x, j) => (j === i ? { ...x, url: v || undefined } : x)))} placeholder="https://…" error={errors[`photos.${i}.url`]} />
                      <Input label="Placeholder colour" value={p.color} onChange={(v) => set("photos", d.photos.map((x, j) => (j === i ? { ...x, color: v } : x)))} error={errors[`photos.${i}.color`]} />
                    </div>
                    <div className="flex gap-1.5 sm:flex-col">
                      <button type="button" aria-label="Move up" className={abtn.small} onClick={() => set("photos", moveItem(d.photos, i, -1))}>↑</button>
                      <button type="button" aria-label="Move down" className={abtn.small} onClick={() => set("photos", moveItem(d.photos, i, 1))}>↓</button>
                      <button type="button" aria-label="Remove photo" className={abtn.small} onClick={() => set("photos", d.photos.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {tab === "itinerary" && (
            <Panel title="Day by day" subtitle={`${d.itinerary.length} day${d.itinerary.length === 1 ? "" : "s"} · a ${d.nights}-night trip usually has ${Number(d.nights) + 1}.`} action={<button type="button" className={abtn.small} onClick={() => set("itinerary", [...d.itinerary, { day: d.itinerary.length + 1, title: "", description: "" }])}>+ Add day</button>}>
              <ol className="flex flex-col gap-4">
                {d.itinerary.map((day, i) => (
                  <li key={i} className="flex gap-4 rounded-[4px] border border-line p-4">
                    <span className="font-display text-[26px] text-teal">{String(i + 1).padStart(2, "0")}</span>
                    <div className="grid flex-1 gap-3">
                      <Input label="Title" value={day.title} onChange={(v) => set("itinerary", d.itinerary.map((x, j) => (j === i ? { ...x, title: v } : x)))} error={errors[`itinerary.${i}.title`]} />
                      <TextArea label="What happens" rows={2} value={day.description} onChange={(v) => set("itinerary", d.itinerary.map((x, j) => (j === i ? { ...x, description: v } : x)))} />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input label="Stay" value={day.stay ?? ""} onChange={(v) => set("itinerary", d.itinerary.map((x, j) => (j === i ? { ...x, stay: v } : x)))} />
                        <Input label="Meals" value={day.meals ?? ""} onChange={(v) => set("itinerary", d.itinerary.map((x, j) => (j === i ? { ...x, meals: v } : x)))} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button type="button" aria-label="Move day up" className={abtn.small} onClick={() => set("itinerary", moveItem(d.itinerary, i, -1))}>↑</button>
                      <button type="button" aria-label="Move day down" className={abtn.small} onClick={() => set("itinerary", moveItem(d.itinerary, i, 1))}>↓</button>
                      <button type="button" aria-label="Remove day" className={abtn.small} onClick={() => set("itinerary", d.itinerary.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          )}

          {tab === "hotels" && (
            <>
              <Panel title="Hotels" subtitle="Shown as “Where you'll stay”. Use “or similar” language in names if not confirmed." action={<button type="button" className={abtn.small} onClick={() => set("hotels", [...d.hotels, { stop: "", name: "", category: "", roomType: "" }])}>+ Add hotel</button>}>
                {d.hotels.length === 0 && <p className="text-[14px] text-stone">No hotels listed. The section is hidden on the site until you add one.</p>}
                {d.hotels.map((h, i) => (
                  <div key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_1.5fr_1fr_1fr_auto]">
                    {(["stop", "name", "category", "roomType"] as const).map((k) => (
                      <Input key={k} label={{ stop: "Stop", name: "Hotel", category: "Category", roomType: "Room" }[k]} value={h[k]} onChange={(v) => set("hotels", d.hotels.map((x, j) => (j === i ? { ...x, [k]: v } : x)))} />
                    ))}
                    <button type="button" aria-label="Remove hotel" className={`${abtn.small} mb-1`} onClick={() => set("hotels", d.hotels.filter((_, j) => j !== i))}>✕</button>
                  </div>
                ))}
              </Panel>
              <Panel title="What's in the price">
                <div className="grid gap-5 sm:grid-cols-2">
                  <LinesInput label="Included" value={d.inclusions} onChange={(v) => set("inclusions", v)} placeholder={"5 nights' stay, twin sharing\nBreakfast and dinner daily"} />
                  <LinesInput label="Not included" value={d.exclusions} onChange={(v) => set("exclusions", v)} placeholder={"Flights\n5% GST"} />
                </div>
              </Panel>
            </>
          )}

          {tab === "departures" && (id ? <DeparturesManager packageId={id} departures={departures} canEdit={canEdit} /> : <Panel title="Departures"><p className="text-[14px] text-stone">Save the draft first, then add fixed departures.</p></Panel>)}

          {tab === "policy" && (
            <>
              <Panel title="Cancellation policy">
                <TextArea label="Policy summary" value={d.cancellationPolicy} onChange={(v) => set("cancellationPolicy", v)} rows={3} hint="Shown under the departures table." />
              </Panel>
              <Panel title="FAQs" action={<button type="button" className={abtn.small} onClick={() => set("faqs", [...d.faqs, { q: "", a: "" }])}>+ Add question</button>}>
                {d.faqs.map((f, i) => (
                  <div key={i} className="flex gap-3 rounded-[4px] border border-line p-4">
                    <div className="grid flex-1 gap-3">
                      <Input label="Question" value={f.q} onChange={(v) => set("faqs", d.faqs.map((x, j) => (j === i ? { ...x, q: v } : x)))} />
                      <TextArea label="Answer" rows={2} value={f.a} onChange={(v) => set("faqs", d.faqs.map((x, j) => (j === i ? { ...x, a: v } : x)))} />
                    </div>
                    <button type="button" aria-label="Remove question" className={`${abtn.small} self-start`} onClick={() => set("faqs", d.faqs.filter((_, j) => j !== i))}>✕</button>
                  </div>
                ))}
              </Panel>
            </>
          )}

          {tab === "seo" && (
            <Panel title="Search & sharing" subtitle="Falls back to the title and summary when left blank.">
              <Input label="SEO title" value={d.seoTitle} onChange={(v) => set("seoTitle", v)} max={70} error={errors.seoTitle} placeholder={`${d.title} — ${d.nights}N/${Number(d.nights) + 1}D ${dest?.name ?? ""}`} />
              <TextArea label="Meta description" value={d.seoDescription} onChange={(v) => set("seoDescription", v)} max={160} rows={3} error={errors.seoDescription} placeholder={d.summary} />
              <div className="rounded-[4px] border border-line p-4">
                <p className="text-[12px] text-stone">Google preview</p>
                <p className="truncate text-[18px] text-[#1a0dab]">{d.seoTitle || `${d.title} — ${d.nights}N/${Number(d.nights) + 1}D ${dest?.name ?? ""}`} · Safarscape</p>
                <p className="text-[13px] text-success">{siteUrl.replace(/^https?:\/\//, "")}/packages/{d.slug || "…"}</p>
                <p className="text-[14px] text-stone">{d.seoDescription || d.summary}</p>
              </div>
            </Panel>
          )}
        </fieldset>

        <aside className="flex flex-col gap-6">
          <section className="rounded-[8px] border border-line bg-white p-5">
            <div className="flex items-baseline justify-between"><h2 className="text-[17px] font-medium">Completeness</h2><span className="text-[14px] font-medium text-teal">{doneCount}/{sections.length} sections</span></div>
            <div className="my-3 h-1.5 rounded-full bg-admin-bg"><div className="h-1.5 rounded-full bg-teal" style={{ width: `${(doneCount / sections.length) * 100}%` }} /></div>
            <ul className="flex flex-col gap-2">
              {sections.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-2 text-[14px]">
                  <span className={`flex items-center gap-2 ${s.done ? "text-charcoal" : "text-warning"}`}>
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full ${s.done ? "bg-success-bg text-success" : "border border-dashed border-warning"}`}>{s.done && <CheckIcon className="h-2.5 w-2.5" />}</span>
                    {s.label}
                  </span>
                  {!s.done && <button type="button" className="text-[13px] text-teal" onClick={() => setTab(s.key as Tab)}>Add</button>}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-[8px] border border-line bg-white p-5">
            <div className="mb-3 flex justify-between"><h2 className="text-[17px] font-medium">Page preview</h2>{id && <Link href={`/admin/packages/${id}/preview`} target="_blank" className="text-[14px] text-teal">Open ↗</Link>}</div>
            <div className="overflow-hidden rounded-[4px] border border-line">
              <div className="flex h-[110px] items-end p-3" style={{ backgroundColor: d.photos[0]?.color ?? "#9AA7A3" }}><span className="font-display text-[16px] text-white drop-shadow">{d.title || "Untitled"}</span></div>
              <div className="flex justify-between p-3 text-[12px]"><span className="text-stone">{d.nights}N/{Number(d.nights) + 1}D · {dest?.name ?? "—"}</span><strong>from {formatINR(Number(d.priceFrom))}</strong></div>
            </div>
          </section>
        </aside>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="flex w-full max-w-[460px] flex-col gap-4 rounded-[8px] bg-white p-6">
            <h2 id="confirm-title" className="font-display text-[24px] text-teal">{confirm === "published" ? "Publish this package?" : "Unpublish this package?"}</h2>
            <p className="text-[15px] text-stone">
              {confirm === "published"
                ? `It will appear on the site at /packages/${d.slug || "…"} and in search results. ${doneCount < sections.length ? `${sections.length - doneCount} optional section(s) are still empty.` : ""}`
                : "It disappears from the site immediately. Existing enquiries keep their link to it."}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className={abtn.secondary} onClick={() => setConfirm(null)}>Cancel</button>
              <button type="button" className={abtn.primary} disabled={pending} onClick={() => changeStatus(confirm)}>{confirm === "published" ? "Publish now" : "Unpublish"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
