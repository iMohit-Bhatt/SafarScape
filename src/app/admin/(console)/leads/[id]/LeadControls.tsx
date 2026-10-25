"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { LeadStatus } from "@/db/schema";
import { statusStyle, abtn, Card } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";
import { PhoneIcon, WhatsAppIcon, CalendarIcon, MailIcon } from "@/components/ui/icons";
import { timeAgo } from "@/lib/format";
import { statusAction, assignAction, followUpAction, activityAction, retryEmailAction } from "../actions";
import type { ActionResult } from "@/lib/action-result";

function useAct() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<ActionResult>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      toast(r.ok ? r.message ?? "Saved" : r.error, r.ok ? "success" : "error");
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });
  return { act, pending };
}

const STATUSES: LeadStatus[] = ["new", "contacted", "quoted", "converted", "lost"];

export function LeadHeaderControls(p: {
  id: number; status: LeadStatus; assigneeId: number | null; staff: { id: number; name: string }[]; lostReasons: string[];
  canAssign: boolean; meId: number; phone: string; phoneLabel: string; email: string | null; wa: string | null; quotedAmount: number | null;
}) {
  const { act, pending } = useAct();
  const [dialog, setDialog] = useState<null | "lost" | "quoted">(null);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState(p.quotedAmount ? String(p.quotedAmount) : "");
  const [note, setNote] = useState("");
  const copy = (t: string) => navigator.clipboard?.writeText(t);

  const onStatus = (s: LeadStatus) => {
    if (s === "lost") return setDialog("lost");
    if (s === "quoted") return setDialog("quoted");
    act(() => statusAction(p.id, s, {}));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="lead-status">Status</label>
        <select id="lead-status" disabled={pending} value={p.status} onChange={(e) => onStatus(e.target.value as LeadStatus)} className={`rounded-[4px] border border-line px-3 py-2 text-[14px] font-medium ${statusStyle[p.status]}`}>
          {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
        <label className="sr-only" htmlFor="lead-owner">Owner</label>
        {p.canAssign ? (
          <select id="lead-owner" disabled={pending} value={p.assigneeId ?? ""} onChange={(e) => act(() => assignAction(p.id, e.target.value ? Number(e.target.value) : null))} className="rounded-[4px] border border-line bg-white px-3 py-2 text-[14px]">
            <option value="">Unassigned</option>
            {p.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        ) : p.assigneeId == null ? (
          <button type="button" className={abtn.secondary} disabled={pending} onClick={() => act(() => assignAction(p.id, p.meId))}>Assign to me</button>
        ) : (
          <span className="rounded-[4px] border border-line bg-white px-3 py-2 text-[14px]">{p.staff.find((s) => s.id === p.assigneeId)?.name}</span>
        )}
        <div className="ml-auto flex gap-2">
          <a href={`tel:${p.phone}`} className={abtn.primary} onClick={() => activityAction(p.id, "call", "")}><PhoneIcon /> Call</a>
          {p.wa && <a href={p.wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-[4px] bg-whatsapp px-5 py-2.5 text-[15px] font-medium text-white" onClick={() => activityAction(p.id, "whatsapp", "")}><WhatsAppIcon /> WhatsApp</a>}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => copy(p.phone)} className="flex items-center justify-between rounded-[4px] border border-line bg-white px-4 py-2.5 text-left text-[15px]" title="Copy phone"><span className="flex items-center gap-2"><PhoneIcon className="h-4 w-4 text-stone" />{p.phoneLabel}</span><span className="text-[12px] text-stone">Copy</span></button>
        {p.email ? <button type="button" onClick={() => copy(p.email!)} className="flex items-center justify-between rounded-[4px] border border-line bg-white px-4 py-2.5 text-left text-[15px]" title="Copy email"><span className="flex items-center gap-2"><MailIcon className="h-4 w-4 text-stone" />{p.email}</span><span className="text-[12px] text-stone">Copy</span></button> : <span className="rounded-[4px] border border-dashed border-line px-4 py-2.5 text-[14px] text-stone">No email given</span>}
      </div>

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && setDialog(null)}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-dialog-title"
            className="flex w-full max-w-[440px] flex-col gap-4 rounded-[8px] bg-white p-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (dialog === "lost") act(() => statusAction(p.id, "lost", { lostReason: reason, note }), () => setDialog(null));
              else act(() => statusAction(p.id, "quoted", { quotedAmount: amount ? Number(amount.replace(/\D/g, "")) : undefined, note }), () => setDialog(null));
            }}
          >
            <h2 id="status-dialog-title" className="font-display text-[24px] text-teal">{dialog === "lost" ? "Mark as lost" : "Mark as quoted"}</h2>
            {dialog === "lost" ? (
              <label className="flex flex-col gap-2 text-[14px] font-medium">Why was it lost?
                <select required autoFocus value={reason} onChange={(e) => setReason(e.target.value)} className="field-input">
                  <option value="">Pick a reason</option>
                  {p.lostReasons.map((r) => <option key={r}>{r}</option>)}
                </select>
              </label>
            ) : (
              <label className="flex flex-col gap-2 text-[14px] font-medium">Quoted amount (₹, total)
                <input autoFocus inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="field-input" placeholder="e.g. 72000" />
              </label>
            )}
            <label className="flex flex-col gap-2 text-[14px] font-medium">Note (optional)
              <input value={note} onChange={(e) => setNote(e.target.value)} className="field-input" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className={abtn.secondary} onClick={() => setDialog(null)}>Cancel</button>
              <button type="submit" disabled={pending || (dialog === "lost" && !reason)} className={abtn.primary}>Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function FollowUpBox({ id, followUpAt, closed }: { id: number; followUpAt: string | null; closed: boolean }) {
  const { act, pending } = useAct();
  const [editing, setEditing] = useState(false);
  const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [now] = useState(() => Date.now());
  const [at, setAt] = useState(() => (followUpAt ? local(new Date(followUpAt)) : local(new Date(now + 86400_000))));
  const [note, setNote] = useState("");
  const d = followUpAt ? new Date(followUpAt) : null;
  const overdue = d && d.getTime() < now;
  // Runs only from button clicks, not during render.
  // eslint-disable-next-line react-hooks/purity
  const quick = (h: number) => setAt(local(new Date(Date.now() + h * 3600_000)));
  return (
    <Card title="Next follow-up">
      {d && !editing ? (
        <div className={`flex flex-col gap-3 rounded-[4px] border p-4 ${overdue ? "border-danger/40 bg-danger-bg" : "border-line bg-admin-bg/50"}`}>
          <p className="flex items-center gap-2 text-[15px] font-medium">
            <CalendarIcon />
            {new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(d)}
            {overdue && <span className="rounded bg-danger px-1.5 text-[12px] text-white">Overdue</span>}
          </p>
          <div className="flex gap-2">
            <button type="button" disabled={pending} className={abtn.small} onClick={() => act(() => followUpAction(id, null))}>Mark done</button>
            <button type="button" className={abtn.small} onClick={() => setEditing(true)}>Reschedule</button>
          </div>
        </div>
      ) : closed && !editing ? (
        <p className="text-[14px] text-stone">This lead is closed. No follow-up needed.</p>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); act(() => followUpAction(id, new Date(at).toISOString(), note), () => setEditing(false)); }}>
          <div className="flex flex-wrap gap-1.5">
            {[["In 2h", 2], ["Tomorrow", 24], ["In 3 days", 72], ["Next week", 168]].map(([l, h]) => (
              <button key={l} type="button" className={abtn.small} onClick={() => quick(h as number)}>{l}</button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] text-stone">When
            <input type="datetime-local" required value={at} onChange={(e) => setAt(e.target.value)} className="field-input" />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] text-stone">What to do
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Send revised quote…" className="field-input" />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={abtn.primary}>Set follow-up</button>
            {editing && <button type="button" className={abtn.secondary} onClick={() => setEditing(false)}>Cancel</button>}
          </div>
        </form>
      )}
    </Card>
  );
}

type Act = { id: number; kind: string; body: string; actor: string | null; at: string };
type Mail = { id: number; to: string; subject: string; body: string; status: string; kind: string; error: string | null; at: string };

export function ActivityPanel({ id, activity, emails }: { id: number; activity: Act[]; emails: Mail[] }) {
  const { act, pending } = useAct();
  const [tab, setTab] = useState<"activity" | "notes" | "emails">("activity");
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"note" | "call" | "email">("note");
  const notes = activity.filter((a) => a.kind === "note");
  const list = tab === "notes" ? notes : activity;
  const dot: Record<string, string> = { status: "bg-warning-bg text-warning", call: "bg-info-bg text-teal", whatsapp: "bg-success-bg text-success", email_failed: "bg-danger-bg text-danger" };
  return (
    <Card pad={false} title={
      <div role="tablist" className="flex gap-5">
        {([["activity", "Activity"], ["notes", `Notes · ${notes.length}`], ["emails", `Emails · ${emails.length}`]] as const).map(([t, l]) => (
          <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)} className={`border-b-2 pb-1 text-[15px] ${tab === t ? "border-teal font-medium text-teal" : "border-transparent text-stone"}`}>{l}</button>
        ))}
      </div>
    }>
      <div className="p-6">
        {tab !== "emails" && (
          <form className="mb-6 flex flex-col gap-2 rounded-[4px] border border-line p-3 focus-within:border-teal" onSubmit={(e) => { e.preventDefault(); act(() => activityAction(id, kind, text), () => setText("")); }}>
            <label htmlFor="note" className="sr-only">Add a note</label>
            <textarea id="note" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={kind === "call" ? "How did the call go?" : "Add a note…"} className="resize-none bg-transparent text-[15px] outline-none" />
            <div className="flex items-center gap-2">
              {(["note", "call", "email"] as const).map((k) => (
                <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`rounded-[3px] border px-2 py-1 text-[12px] ${kind === k ? "border-teal bg-info-bg text-teal" : "border-line text-stone"}`}>{k === "note" ? "Note" : k === "call" ? "Log call" : "Log email"}</button>
              ))}
              <button type="submit" disabled={pending || (kind === "note" && !text.trim())} className={`${abtn.primary} ml-auto px-3! py-1.5! text-[13px]!`}>Save</button>
            </div>
          </form>
        )}
        {tab === "emails" ? (
          <ul className="flex flex-col gap-3">
            {emails.length === 0 && <li className="text-[14px] text-stone">No emails sent for this lead.</li>}
            {emails.map((m) => (
              <li key={m.id} className="rounded-[4px] border border-line p-4">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-[14px]">
                    <span className="font-medium">{m.subject}</span>
                    <span className={m.status === "sent" ? "text-success" : "text-danger"}>{m.status === "sent" ? "Sent" : `Failed${m.error ? ` · ${m.error}` : ""}`}</span>
                  </summary>
                  <p className="pt-1 text-[12px] text-stone">To {m.to} · {m.kind === "autoreply" ? "Traveller confirmation" : "Team notification"} · {timeAgo(m.at)}</p>
                  <pre className="mt-3 whitespace-pre-wrap font-sans text-[13px] text-charcoal">{m.body}</pre>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <ol className="flex flex-col gap-5" data-testid="activity">
            {list.map((a) => (
              <li key={a.id} className="flex gap-3">
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${dot[a.kind] ?? "bg-admin-bg text-stone"}`}>•</span>
                <div>
                  <p className="text-[14px] text-charcoal">{a.actor ? `${a.actor} ` : ""}{a.body}</p>
                  <p className="text-[12px] text-stone">{timeAgo(a.at)}</p>
                </div>
              </li>
            ))}
            {list.length === 0 && <li className="text-[14px] text-stone">Nothing yet.</li>}
          </ol>
        )}
      </div>
    </Card>
  );
}

export function RetryEmail({ id }: { id: number }) {
  const { act, pending } = useAct();
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-danger/30 bg-danger-bg px-4 py-3 text-[14px] text-danger">
      <span>The team notification email for this lead failed. The lead is saved — nothing was lost.</span>
      <button type="button" disabled={pending} onClick={() => act(() => retryEmailAction(id))} className={abtn.danger}>{pending ? "Retrying…" : "Retry email"}</button>
    </div>
  );
}
