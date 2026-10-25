"use client";
import { useActionState } from "react";
import { createLeadAction } from "../actions";
import { abtn } from "@/components/admin/ui";

export function NewLeadForm({ packages }: { packages: { id: number; title: string }[] }) {
  const [state, action, pending] = useActionState(createLeadAction, undefined);
  const lbl = "flex flex-col gap-1.5 text-[14px] font-medium text-charcoal";
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      {state && !state.ok && <p role="alert" className="rounded-[4px] bg-danger-bg p-3 text-[14px] text-danger sm:col-span-2">{state.error}</p>}
      <label className={lbl}>Name<input name="name" required className="field-input" /></label>
      <label className={lbl}>Phone<input name="phone" required type="tel" className="field-input" placeholder="98110 45672" /></label>
      <label className={lbl}>Email<input name="email" type="email" className="field-input" /></label>
      <label className={lbl}>Source
        <select name="source" className="field-input">
          {["phone", "whatsapp", "instagram", "walk-in", "referral", "email"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label className={`${lbl} sm:col-span-2`}>Package
        <select name="packageId" className="field-input"><option value="">Not decided</option>{packages.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
      </label>
      <label className={`${lbl} sm:col-span-2`}>Notes<textarea name="message" rows={3} className="field-input" /></label>
      <div className="sm:col-span-2"><button disabled={pending} className={abtn.primary}>{pending ? "Saving…" : "Add lead"}</button></div>
    </form>
  );
}
