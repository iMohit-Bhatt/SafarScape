"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { LeadStatus } from "@/db/schema";
import { StatusBadge, Avatar, SourceDot, Th, Td, Empty } from "@/components/admin/ui";
import { maskPhone, timeAgo } from "@/lib/format";
import { bulkAction } from "./actions";
import { useToast } from "@/components/admin/Toast";

type Row = {
  id: number; name: string; phone: string; reference: string; pkg: string; sub: string; travel: string | null; pax: string;
  source: string; status: LeadStatus; owner: string | null; followUpAt: string | null; createdAt: string; emailFailed: boolean;
};

function followLabel(iso: string | null) {
  if (!iso) return <span className="text-stone">—</span>;
  const d = new Date(iso);
  const overdue = d < new Date();
  const label = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(d);
  return overdue ? <span className="text-danger">{label}<span className="block text-[12px]">Overdue</span></span> : label;
}

export function LeadsTable({ rows, staff, lostReasons, canAssign, canExport, exportHref }: { rows: Row[]; staff: { id: number; name: string }[]; lostReasons: string[]; canAssign: boolean; canExport: boolean; exportHref: string }) {
  const [sel, setSel] = useState<number[]>([]);
  const [pending, start] = useTransition();
  const [lostOpen, setLostOpen] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const all = rows.length > 0 && sel.length === rows.length;
  const toggle = (id: number) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const apply = (a: Parameters<typeof bulkAction>[1]) =>
    start(async () => {
      const r = await bulkAction(sel, a);
      toast(r.ok ? r.message ?? "Done" : r.error, r.ok ? "success" : "error");
      if (r.ok) {
        setSel([]);
        router.refresh();
      }
    });

  if (!rows.length) return <Empty title="No leads match" body="Try clearing a filter or switching tabs. New website enquiries appear here instantly." />;

  return (
    <div>
      {sel.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-teal px-6 py-3 text-ivory" role="toolbar" aria-label="Bulk actions">
          <span className="text-[15px] font-medium">{sel.length} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            {canAssign && (
              <select aria-label="Assign selected" disabled={pending} className="rounded-[4px] border border-ivory/40 bg-teal px-3 py-1.5 text-[14px]" value="" onChange={(e) => e.target.value && apply({ assigneeId: e.target.value === "none" ? null : Number(e.target.value) })}>
                <option value="">Assign…</option>
                <option value="none">Unassign</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <select aria-label="Change status of selected" disabled={pending} className="rounded-[4px] border border-ivory/40 bg-teal px-3 py-1.5 text-[14px]" value="" onChange={(e) => { const v = e.target.value as LeadStatus; if (!v) return; if (v === "lost") setLostOpen(true); else apply({ status: v }); }}>
              <option value="">Change status…</option>
              {["new", "contacted", "quoted", "converted", "lost"].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>
            {lostOpen && (
              <select aria-label="Lost reason" autoFocus className="rounded-[4px] border border-ivory/40 bg-teal px-3 py-1.5 text-[14px]" value="" onChange={(e) => { setLostOpen(false); if (e.target.value) apply({ status: "lost", lostReason: e.target.value }); }}>
                <option value="">Lost reason…</option>
                {lostReasons.map((r) => <option key={r}>{r}</option>)}
              </select>
            )}
            {canExport && <a href={exportHref} className="rounded-[4px] border border-ivory/40 px-3 py-1.5 text-[14px]">Export</a>}
            <button type="button" onClick={() => setSel([])} className="px-2 text-[14px]">Cancel</button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px]">
          <thead className="border-b border-line bg-admin-bg/50">
            <tr>
              <th className="w-10 pl-6"><input type="checkbox" aria-label="Select all" className="h-4 w-4 accent-teal" checked={all} onChange={() => setSel(all ? [] : rows.map((r) => r.id))} /></th>
              <Th>Lead</Th><Th>Package / destination</Th><Th>Travel</Th><Th>Pax</Th><Th>Source</Th><Th>Status</Th><Th>Owner</Th><Th>Follow-up</Th><Th>Created</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-b border-line last:border-0 hover:bg-admin-bg/60 ${sel.includes(r.id) ? "bg-info-bg/50" : ""}`}>
                <td className="pl-6"><input type="checkbox" aria-label={`Select ${r.name}`} className="h-4 w-4 accent-teal" checked={sel.includes(r.id)} onChange={() => toggle(r.id)} /></td>
                <Td>
                  <Link href={`/admin/leads/${r.id}`} className="font-medium text-charcoal hover:underline">{r.name}</Link>
                  <span className="block text-[12px] text-stone">{maskPhone(r.phone)} · {r.reference}</span>
                </Td>
                <Td>{r.pkg}<span className="block text-[12px] text-stone">{r.sub}</span></Td>
                <Td>{r.travel ?? "—"}</Td>
                <Td>{r.pax}</Td>
                <Td><SourceDot source={r.source} /></Td>
                <Td><StatusBadge status={r.status} />{r.emailFailed && <span className="mt-1 block text-[11px] text-danger">Email failed</span>}</Td>
                <Td><Avatar name={r.owner} /></Td>
                <Td>{followLabel(r.followUpAt)}</Td>
                <Td className="text-stone">{timeAgo(r.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pending && <p className="sr-only" role="status">Updating…</p>}
    </div>
  );
}
