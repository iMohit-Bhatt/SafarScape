"use client";
import { useState } from "react";
import { abtn } from "@/components/admin/ui";
import { Input, TextArea, Panel } from "@/components/admin/form";
import { fillTemplate, whatsappLink } from "@/lib/whatsapp";
import type { Settings } from "@/lib/settings";
import { agencyAction } from "../actions";
import { useSave } from "../../content/useSave";

export function AgencyForm({ agency, template }: { agency: Settings["agency"]; template: string }) {
  const { run, pending, errors } = useSave();
  const [a, setA] = useState(agency);
  const [t, setT] = useState(template);
  const set = (k: keyof Settings["agency"], v: string) => setA({ ...a, [k]: v });
  const preview = fillTemplate(t, { package_name: "Gulmarg snow, Dal Lake mornings (Kashmir, 5N/6D)" });
  const link = whatsappLink(a.whatsapp, preview);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Contact details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Phone" value={a.phone} onChange={(v) => set("phone", v)} error={errors.phone} placeholder="+91 …" />
          <Input label="WhatsApp number" value={a.whatsapp} onChange={(v) => set("whatsapp", v)} error={errors.whatsapp} placeholder="+91 …" hint="Used for every WhatsApp button on the site." />
          <Input label="Email" value={a.email} onChange={(v) => set("email", v)} error={errors.email} />
          <Input label="Hours" value={a.hours} onChange={(v) => set("hours", v)} />
        </div>
        <TextArea label="Office address" rows={2} value={a.address} onChange={(v) => set("address", v)} />
        <Input label="Map link" value={a.mapUrl} onChange={(v) => set("mapUrl", v)} error={errors.mapUrl} placeholder="https://maps.google.com/…" />
        <Input label="Instagram" value={a.instagram} onChange={(v) => set("instagram", v)} placeholder="https://instagram.com/…" />
      </Panel>
      <Panel title="WhatsApp message" subtitle="Prefilled when a visitor taps a WhatsApp button on a package.">
        <TextArea label="Message template" rows={3} value={t} onChange={setT} error={errors.whatsappTemplate} hint="{{package_name}} is replaced with the trip they were looking at." />
        <div className="rounded-[8px] bg-[#E7F3EC] p-4">
          <p className="text-[12px] uppercase tracking-[0.12em] text-stone">Preview</p>
          <p className="mt-2 inline-block rounded-[8px] bg-white px-3 py-2 text-[14px] shadow-sm">{preview}</p>
          {link ? <p className="mt-3 break-all text-[12px] text-stone">{link}</p> : <p className="mt-3 text-[13px] text-warning">Add a WhatsApp number to turn on WhatsApp buttons.</p>}
        </div>
      </Panel>
      <div className="xl:col-span-2"><button type="button" disabled={pending} className={abtn.primary} onClick={() => run(() => agencyAction({ agency: a, whatsappTemplate: t }))}>Save agency details</button></div>
    </div>
  );
}
