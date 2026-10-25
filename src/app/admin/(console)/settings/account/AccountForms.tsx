"use client";
import { useState } from "react";
import { abtn } from "@/components/admin/ui";
import { Input, Panel } from "@/components/admin/form";
import { profileAction, passwordAction } from "../actions";
import { useSave } from "../../content/useSave";

export function AccountForms({ name, phone }: { name: string; phone: string }) {
  const { run, pending, errors } = useSave();
  const [p, setP] = useState({ name, phone });
  const [pw, setPw] = useState({ current: "", next: "" });
  return (
    <>
      <Panel title="Profile">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" value={p.name} onChange={(v) => setP({ ...p, name: v })} error={errors.name} />
          <Input label="Phone" value={p.phone} onChange={(v) => setP({ ...p, phone: v })} />
        </div>
        <div><button type="button" disabled={pending} className={abtn.primary} onClick={() => run(() => profileAction(p))}>Save profile</button></div>
      </Panel>
      <Panel title="Password">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Current password" type="password" value={pw.current} onChange={(v) => setPw({ ...pw, current: v })} />
          <Input label="New password" type="password" value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} hint="At least 10 characters with a number." />
        </div>
        {errors.form && <p role="alert" className="text-[13px] text-danger">{errors.form}</p>}
        <div><button type="button" disabled={pending} className={abtn.primary} onClick={() => run(() => passwordAction(pw.current, pw.next), () => setPw({ current: "", next: "" }))}>Change password</button></div>
      </Panel>
    </>
  );
}
