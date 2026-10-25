"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Role } from "@/db/schema";
import { abtn, Avatar, Card, Th, Td } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";
import { timeAgo } from "@/lib/format";
import { inviteAction, roleAction, activeAction } from "../actions";
import type { ActionResult } from "@/lib/action-result";

type M = { id: number; name: string; email: string; role: Role; status: string; openLeads: number; lastActiveAt: string | null };

export function TeamManager({ members, meId }: { members: M[]; meId: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const [inv, setInv] = useState({ name: "", email: "", role: "sales" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const go = (fn: () => Promise<ActionResult>, after?: () => void) => start(async () => { const r = await fn(); toast(r.ok ? r.message ?? "Saved" : r.error, r.ok ? "success" : "error"); setErrors(r.ok ? {} : r.fieldErrors ?? {}); if (r.ok) { after?.(); router.refresh(); } });
  return (
    <div className="flex flex-col gap-6">
      <Card title="Invite a teammate">
        <form className="grid items-end gap-3 sm:grid-cols-[1fr_1.4fr_160px_auto]" onSubmit={(e) => { e.preventDefault(); go(() => inviteAction(inv), () => setInv({ name: "", email: "", role: "sales" })); }}>
          <label className="flex flex-col gap-1.5 text-[14px] font-medium">Name<input required className="field-input text-[15px]!" value={inv.name} onChange={(e) => setInv({ ...inv, name: e.target.value })} />{errors.name && <span className="text-[12px] text-danger">{errors.name}</span>}</label>
          <label className="flex flex-col gap-1.5 text-[14px] font-medium">Work email<input required type="email" className="field-input text-[15px]!" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} />{errors.email && <span className="text-[12px] text-danger">{errors.email}</span>}</label>
          <label className="flex flex-col gap-1.5 text-[14px] font-medium">Role<select className="field-input text-[15px]!" value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value })}><option value="sales">Sales</option><option value="manager">Manager</option><option value="owner">Owner</option></select></label>
          <button disabled={pending} className={abtn.primary}>Send invite</button>
        </form>
        <p className="mt-3 text-[13px] text-stone">They get an email with a link to set their password (valid for one hour).</p>
      </Card>
      <Card pad={false} title={`Team · ${members.length}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-line"><tr><Th>Member</Th><Th>Role</Th><Th>Status</Th><Th className="text-right">Open leads</Th><Th>Last active</Th><Th /></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <Td><div className="flex items-center gap-3"><Avatar name={m.name} /><div><p className="font-medium">{m.name}{m.id === meId && " (you)"}</p><p className="text-[12px] text-stone">{m.email}</p></div></div></Td>
                  <Td>
                    <select aria-label={`Role for ${m.name}`} disabled={pending || m.status === "deactivated"} value={m.role} onChange={(e) => go(() => roleAction(m.id, e.target.value as Role))} className="rounded-[4px] border border-line px-2 py-1.5 text-[14px]">
                      <option value="owner">Owner</option><option value="manager">Manager</option><option value="sales">Sales</option>
                    </select>
                  </Td>
                  <Td><span className={`rounded px-2 py-0.5 text-[12px] capitalize ${m.status === "active" ? "bg-success-bg text-success" : m.status === "invited" ? "bg-info-bg text-teal" : "bg-admin-bg text-stone"}`}>{m.status}</span></Td>
                  <Td className="text-right">{m.openLeads}</Td>
                  <Td className="text-stone">{m.lastActiveAt ? timeAgo(m.lastActiveAt) : "Never"}</Td>
                  <Td className="text-right">{m.id !== meId && (m.status === "deactivated" ? <button type="button" disabled={pending} className={abtn.small} onClick={() => go(() => activeAction(m.id, true))}>Reactivate</button> : <button type="button" disabled={pending} className={abtn.small} onClick={() => confirm(`Deactivate ${m.name}? They'll be signed out and their ${m.openLeads} open lead(s) return to the unassigned queue.`) && go(() => activeAction(m.id, false))}>Deactivate</button>)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
