"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import type { LeadStatus } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { run, strip, type ActionResult } from "@/lib/action-result";
import { changeStatus, assignLead, setFollowUp, addActivity, bulkUpdate, createManualLead } from "@/lib/leads";
import { retryEnquiryEmail } from "@/lib/enquiries";

const refresh = (id?: number) => {
  revalidatePath("/admin/leads");
  if (id) revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");
};

export async function statusAction(id: number, status: LeadStatus, opts: { lostReason?: string; quotedAmount?: number; note?: string }): Promise<ActionResult> {
  const r = await run(async () => changeStatus(await getDb(), await requireUser("leads.edit"), id, status, opts), "Status updated");
  if (r.ok) refresh(id);
  return strip(r);
}

export async function assignAction(id: number, assigneeId: number | null): Promise<ActionResult> {
  const r = await run(async () => assignLead(await getDb(), await requireUser("leads.edit"), id, assigneeId), "Owner updated");
  if (r.ok) refresh(id);
  return strip(r);
}

export async function followUpAction(id: number, at: string | null, note?: string): Promise<ActionResult> {
  const r = await run(async () => setFollowUp(await getDb(), await requireUser("leads.edit"), id, at ? new Date(at) : null, note), at ? "Follow-up scheduled" : "Follow-up marked done");
  if (r.ok) refresh(id);
  return strip(r);
}

export async function activityAction(id: number, kind: "note" | "call" | "whatsapp" | "email", body: string): Promise<ActionResult> {
  const r = await run(async () => addActivity(await getDb(), await requireUser("leads.edit"), id, kind, body), "Saved");
  if (r.ok) refresh(id);
  return strip(r);
}

export async function retryEmailAction(id: number): Promise<ActionResult> {
  const r = await run(async () => {
    await requireUser("leads.edit");
    const ok = await retryEnquiryEmail(await getDb(), id);
    if (!ok) throw new Error("retry failed");
  }, "Team notification re-sent");
  if (r.ok) refresh(id);
  return r.ok ? strip(r) : { ok: false, error: "Email still failing. Check Email & routing settings." };
}

export async function bulkAction(ids: number[], action: { status?: LeadStatus; lostReason?: string; assigneeId?: number | null }): Promise<ActionResult> {
  const r = await run(async () => bulkUpdate(await getDb(), await requireUser("leads.edit"), ids, action));
  if (r.ok) refresh();
  return r.ok ? { ok: true, message: `Updated ${r.data} lead${r.data === 1 ? "" : "s"}` } : r;
}

export async function createLeadAction(_: ActionResult | undefined, form: FormData): Promise<ActionResult> {
  const r = await run(async () =>
    createManualLead(await getDb(), await requireUser("leads.edit"), {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? "") || undefined,
      packageId: Number(form.get("packageId")) || undefined,
      source: String(form.get("source") ?? "phone"),
      message: String(form.get("message") ?? "") || undefined,
    }),
  );
  if (!r.ok) return r;
  refresh();
  redirect(`/admin/leads/${r.data!.id}`);
}
