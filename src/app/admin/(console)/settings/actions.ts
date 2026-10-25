"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getDb } from "@/db";
import type { Role } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { run, strip, type ActionResult } from "@/lib/action-result";
import { setSetting, type Settings } from "@/lib/settings";
import { inviteMember, changeRole, setActive, updateProfile } from "@/lib/admin-team";
import { changePassword } from "@/lib/auth";
import { ValidationError } from "@/lib/admin-catalogue";
import { sendLogged } from "@/lib/email";
import { normalisePhone } from "@/lib/phone";

async function origin() {
  const h = await headers();
  return process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

export async function inviteAction(input: unknown): Promise<ActionResult> {
  const r = await run(async () => inviteMember(await getDb(), await requireUser("settings.team"), input, await origin()), "Invite sent");
  if (r.ok) revalidatePath("/admin/settings/team");
  return strip(r);
}
export async function roleAction(id: number, role: Role): Promise<ActionResult> {
  const r = await run(async () => changeRole(await getDb(), await requireUser("settings.team"), id, role), "Role updated");
  if (r.ok) revalidatePath("/admin/settings/team");
  return strip(r);
}
export async function activeAction(id: number, active: boolean): Promise<ActionResult> {
  const r = await run(async () => setActive(await getDb(), await requireUser("settings.team"), id, active), active ? "Reactivated" : "Deactivated — their open leads are back in the unassigned queue");
  if (r.ok) revalidatePath("/admin/settings/team");
  return strip(r);
}

const emailList = z.array(z.email("One of the addresses isn't a valid email.")).min(1, "Add at least one address.");
export async function emailSettingsAction(input: { recipients: string[]; rules: { destinationSlugs: string[]; to: string }[]; autoReply: Settings["autoReply"] }): Promise<ActionResult> {
  return run(async () => {
    await requireUser("settings.email");
    const rec = emailList.safeParse(input.recipients.map((s) => s.trim()).filter(Boolean));
    if (!rec.success) throw new ValidationError({ recipients: rec.error.issues[0].message });
    for (const rule of input.rules) if (!z.email().safeParse(rule.to).success) throw new ValidationError({ rules: `“${rule.to}” isn't a valid email.` });
    if (input.autoReply.enabled && (!input.autoReply.subject.trim() || !input.autoReply.body.includes("{{reference}}")))
      throw new ValidationError({ autoReply: "The auto-reply needs a subject and must include {{reference}}." });
    const db = await getDb();
    await setSetting(db, "emailRecipients", rec.data);
    await setSetting(db, "routingRules", input.rules.filter((r) => r.to && r.destinationSlugs.length));
    await setSetting(db, "autoReply", input.autoReply);
  }, "Email settings saved").then(strip);
}

export async function testEmailAction(to: string): Promise<ActionResult> {
  const user = await requireUser("settings.email").catch(() => null);
  if (!user) return { ok: false, error: "Your role doesn't allow this." };
  const r = await sendLogged(await getDb(), { to, subject: "Safarscape test email", text: `This is a test from the Safarscape admin, sent by ${user.name}. If you can read this, enquiry emails will reach this inbox.` }, { kind: "test" });
  return r.ok ? { ok: true, message: `Test email sent to ${to}` } : { ok: false, error: `Sending failed: ${r.error}` };
}

export async function agencyAction(input: { agency: Settings["agency"]; whatsappTemplate: string }): Promise<ActionResult> {
  return run(async () => {
    await requireUser("settings.agency");
    const a = input.agency;
    const fe: Record<string, string> = {};
    if (a.phone && !normalisePhone(a.phone)) fe.phone = "Enter a valid phone number with country code.";
    if (a.whatsapp && !normalisePhone(a.whatsapp)) fe.whatsapp = "Enter a valid WhatsApp number with country code.";
    if (a.email && !z.email().safeParse(a.email).success) fe.email = "Enter a valid email.";
    if (a.mapUrl && !/^https:\/\//.test(a.mapUrl)) fe.mapUrl = "Use a https:// link.";
    if (!input.whatsappTemplate.includes("{{package_name}}")) fe.whatsappTemplate = "Keep {{package_name}} in the message so we know which trip they mean.";
    if (Object.keys(fe).length) throw new ValidationError(fe);
    const db = await getDb();
    await setSetting(db, "agency", { ...a, phone: a.phone ? normalisePhone(a.phone)! : "", whatsapp: a.whatsapp ? normalisePhone(a.whatsapp)! : "" });
    await setSetting(db, "whatsappTemplate", input.whatsappTemplate);
    revalidatePath("/", "layout");
  }, "Agency details saved").then(strip);
}

export async function profileAction(input: unknown): Promise<ActionResult> {
  const r = await run(async () => updateProfile(await getDb(), await requireUser(), input), "Profile saved");
  revalidatePath("/admin", "layout");
  return strip(r);
}
export async function passwordAction(current: string, next: string): Promise<ActionResult> {
  return run(async () => {
    const r = await changePassword(await getDb(), (await requireUser()).id, current, next);
    if (!r.ok) throw new ValidationError({ form: r.error });
  }, "Password changed").then(strip);
}
