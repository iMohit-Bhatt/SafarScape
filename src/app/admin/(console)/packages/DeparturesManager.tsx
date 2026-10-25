"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { abtn } from "@/components/admin/ui";
import { Panel } from "@/components/admin/form";
import { useToast } from "@/components/admin/Toast";
import { formatDateRange, formatINR } from "@/lib/format";
import { saveDepartureAction, deleteDepartureAction } from "./actions";

export type Dep = { id: number; startDate: string; endDate: string; price: number; seatsTotal: number; seatsLeft: number; status: string };
const blank = { startDate: "", endDate: "", price: "", seatsTotal: "16", seatsLeft: "16" };

export function DeparturesManager({ packageId, departures, canEdit }: { packageId: number; departures: Dep[]; canEdit: boolean }) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const begin = (d?: Dep) => {
    setErrors({});
    setEditing(d ? d.id : "new");
    setF(d ? { startDate: d.startDate, endDate: d.endDate, price: String(d.price), seatsTotal: String(d.seatsTotal), seatsLeft: String(d.seatsLeft) } : blank);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await saveDepartureAction(packageId, editing === "new" ? null : (editing as number), f);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        toast(r.error, "error");
        return;
      }
      toast(r.message ?? "Saved");
      setEditing(null);
      router.refresh();
    });
  };
  const inp = "field-input text-[14px]! py-2!";
  return (
    <Panel title="Fixed departures" subtitle="Dates with set prices and seats. Travellers can always ask for their own dates." action={canEdit && editing === null ? <button type="button" className={abtn.small} onClick={() => begin()}>+ Add departure</button> : undefined}>
      {departures.length === 0 && editing === null && <p className="text-[14px] text-stone">No fixed departures — the package shows “Your own dates · On request”.</p>}
      <ul className="divide-y divide-line">
        {departures.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-4 py-3 text-[14px]">
            <span className="w-[170px] font-medium">{formatDateRange(d.startDate, d.endDate)}</span>
            <span className="w-[100px]">{formatINR(d.price)}</span>
            <span className={`w-[130px] ${d.seatsLeft <= 3 ? "text-terracotta" : "text-stone"}`}>{d.seatsLeft} of {d.seatsTotal} seats left</span>
            <span className={`rounded px-2 py-0.5 text-[12px] ${d.status === "open" ? "bg-success-bg text-success" : "bg-admin-bg text-stone"}`}>{d.status}</span>
            {canEdit && (
              <span className="ml-auto flex gap-2">
                <button type="button" className={abtn.small} onClick={() => begin(d)}>Edit</button>
                <button type="button" className={abtn.small} disabled={pending} onClick={() => confirm("Remove this departure?") && start(async () => { const r = await deleteDepartureAction(packageId, d.id); toast(r.ok ? r.message! : r.error, r.ok ? "success" : "error"); router.refresh(); })}>Remove</button>
              </span>
            )}
          </li>
        ))}
      </ul>
      {editing !== null && (
        <form onSubmit={submit} className="grid gap-3 rounded-[4px] border border-teal/40 bg-info-bg/40 p-4 sm:grid-cols-5" aria-label="Departure">
          {([["startDate", "Start", "date"], ["endDate", "End", "date"], ["price", "Price (₹)", "text"], ["seatsTotal", "Seats", "number"], ["seatsLeft", "Seats left", "number"]] as const).map(([k, l, t]) => (
            <label key={k} className="flex flex-col gap-1 text-[13px] font-medium">{l}
              <input type={t} required value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={inp} aria-invalid={!!errors[k] || undefined} />
              {errors[k] && <span className="text-[12px] font-normal text-danger">{errors[k]}</span>}
            </label>
          ))}
          <div className="flex gap-2 sm:col-span-5">
            <button type="submit" disabled={pending} className={abtn.primary}>Save departure</button>
            <button type="button" className={abtn.secondary} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}
    </Panel>
  );
}
