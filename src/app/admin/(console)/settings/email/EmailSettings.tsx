"use client";
import { useState } from "react";
import { abtn } from "@/components/admin/ui";
import { Input, TextArea, Toggle, Panel, LinesInput } from "@/components/admin/form";
import { fillTemplate } from "@/lib/whatsapp";
import { emailSettingsAction, testEmailAction } from "../actions";
import { useSave } from "../../content/useSave";

type Rule = { destinationSlugs: string[]; to: string };
type AR = { enabled: boolean; subject: string; body: string };

export function EmailSettings({ userEmail, recipients, rules, autoReply, destinations }: { userEmail: string; recipients: string[]; rules: Rule[]; autoReply: AR; destinations: { slug: string; name: string }[] }) {
  const { run, pending, errors } = useSave();
  const [rec, setRec] = useState(recipients);
  const [rs, setRs] = useState(rules);
  const [ar, setAr] = useState(autoReply);
  const [testTo, setTestTo] = useState(userEmail);
  const sample = { traveller_name: "Ananya", package_name: "Gulmarg snow, Dal Lake mornings", reference: "SFS-24817", callback_window: "within one working day" };
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="flex flex-col gap-6">
        <Panel title="Team recipients" subtitle="Every new enquiry is emailed here after it's saved.">
          <LinesInput label="Email addresses" value={rec} onChange={setRec} hint="One per line." />
          {errors.recipients && <p role="alert" className="text-[13px] text-danger">{errors.recipients}</p>}
        </Panel>
        <Panel title="Routing by destination" subtitle="Also send enquiries for these destinations to a specialist." action={<button type="button" className={abtn.small} onClick={() => setRs([...rs, { destinationSlugs: [], to: "" }])}>+ Add rule</button>}>
          {rs.length === 0 && <p className="text-[14px] text-stone">No rules — everything goes to the team recipients.</p>}
          {rs.map((r, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-[4px] border border-line p-3">
              <div className="flex flex-wrap gap-1.5">
                {destinations.map((d) => { const on = r.destinationSlugs.includes(d.slug); return <button key={d.slug} type="button" aria-pressed={on} onClick={() => setRs(rs.map((x, j) => (j === i ? { ...x, destinationSlugs: on ? x.destinationSlugs.filter((s) => s !== d.slug) : [...x.destinationSlugs, d.slug] } : x)))} className={`rounded-full border px-2.5 py-0.5 text-[12px] ${on ? "border-teal bg-info-bg text-teal" : "border-line"}`}>{d.name}</button>; })}
              </div>
              <div className="flex gap-2"><input aria-label="Send to" className="field-input text-[14px]!" value={r.to} placeholder="kashmir-desk@youragency.in" onChange={(e) => setRs(rs.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} /><button type="button" aria-label="Remove rule" className={abtn.small} onClick={() => setRs(rs.filter((_, j) => j !== i))}>✕</button></div>
            </div>
          ))}
          {errors.rules && <p role="alert" className="text-[13px] text-danger">{errors.rules}</p>}
        </Panel>
        <Panel title="Send a test email">
          <div className="flex gap-2"><input aria-label="Test recipient" className="field-input text-[14px]!" value={testTo} onChange={(e) => setTestTo(e.target.value)} /><button type="button" disabled={pending} className={abtn.secondary} onClick={() => run(() => testEmailAction(testTo))}>Send test email</button></div>
        </Panel>
      </div>
      <Panel title="Traveller auto-reply" subtitle="Sent when the traveller gives an email address.">
        <Toggle label="Send an auto-reply" checked={ar.enabled} onChange={(v) => setAr({ ...ar, enabled: v })} />
        <Input label="Subject" value={ar.subject} onChange={(v) => setAr({ ...ar, subject: v })} />
        <TextArea label="Message" rows={9} value={ar.body} onChange={(v) => setAr({ ...ar, body: v })} hint="Placeholders: {{traveller_name}}, {{package_name}}, {{reference}}, {{callback_window}}" />
        {errors.autoReply && <p role="alert" className="text-[13px] text-danger">{errors.autoReply}</p>}
        <div className="rounded-[4px] border border-line bg-admin-bg/50 p-4">
          <p className="text-[12px] uppercase tracking-[0.12em] text-stone">Preview</p>
          <p className="mt-1 text-[14px] font-medium">{fillTemplate(ar.subject, sample)}</p>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-[14px]">{fillTemplate(ar.body, sample)}</pre>
        </div>
      </Panel>
      <div className="xl:col-span-2"><button type="button" disabled={pending} className={abtn.primary} onClick={() => run(() => emailSettingsAction({ recipients: rec.filter(Boolean), rules: rs, autoReply: ar }))}>Save email settings</button></div>
    </div>
  );
}
