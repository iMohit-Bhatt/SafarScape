import { and, desc, asc, eq, gte, lte, inArray, isNull, or, ilike, sql, type SQL } from "drizzle-orm";
import type { DB } from "@/db";
import { enquiries, leadActivities, users, packages, destinations, type LeadStatus } from "@/db/schema";
import type { StaffUser } from "./auth";
import { can, ForbiddenError } from "./permissions";
import { normalisePhone } from "./phone";

export const leadStatuses: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "quoted", label: "Quoted" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];
export const lostReasons = ["Price too high", "Booked elsewhere", "Dates changed", "No response", "Just browsing", "Other"];

export class LeadError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export type LeadFilters = {
  tab?: "all" | "new" | "mine" | "followups" | "unassigned";
  q?: string;
  status?: LeadStatus[];
  assignee?: number | "none";
  source?: string[];
  dest?: number[];
  days?: number;
  sort?: "newest" | "oldest" | "followup";
  page?: number;
  pageSize?: number;
};

/** Sales staff only see leads assigned to them plus unassigned ones. */
function scope(actor: StaffUser): SQL | undefined {
  if (can(actor.role, "leads.viewAll")) return undefined;
  return or(eq(enquiries.assigneeId, actor.id), isNull(enquiries.assigneeId));
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function buildWhere(actor: StaffUser, f: LeadFilters): SQL | undefined {
  const parts: (SQL | undefined)[] = [scope(actor)];
  if (f.tab === "new") parts.push(eq(enquiries.status, "new"));
  if (f.tab === "mine") parts.push(eq(enquiries.assigneeId, actor.id));
  if (f.tab === "unassigned") parts.push(isNull(enquiries.assigneeId));
  if (f.tab === "followups")
    parts.push(
      and(lte(enquiries.followUpAt, endOfToday()), inArray(enquiries.status, ["new", "contacted", "quoted"])),
    );
  if (f.q) {
    const like = `%${f.q.replace(/[%_]/g, "")}%`;
    const digits = f.q.replace(/\D/g, "");
    parts.push(
      or(
        ilike(enquiries.name, like),
        ilike(enquiries.email, like),
        ilike(enquiries.reference, like),
        digits.length >= 4 ? ilike(enquiries.phone, `%${digits}%`) : undefined,
      ),
    );
  }
  if (f.status?.length) parts.push(inArray(enquiries.status, f.status));
  if (f.assignee === "none") parts.push(isNull(enquiries.assigneeId));
  else if (typeof f.assignee === "number") parts.push(eq(enquiries.assigneeId, f.assignee));
  if (f.source?.length) parts.push(inArray(enquiries.source, f.source));
  if (f.dest?.length) parts.push(inArray(enquiries.destinationId, f.dest));
  if (f.days) parts.push(gte(enquiries.createdAt, new Date(Date.now() - f.days * 86400_000)));
  const defined = parts.filter(Boolean) as SQL[];
  return defined.length ? and(...defined) : undefined;
}

const leadSelect = {
  lead: enquiries,
  pkgTitle: packages.title,
  pkgSlug: packages.slug,
  pkgNights: packages.nights,
  destName: destinations.name,
  assigneeName: users.name,
};

export async function listLeads(db: DB, actor: StaffUser, f: LeadFilters = {}) {
  if (!can(actor.role, "leads.view")) throw new ForbiddenError("leads.view");
  const where = buildWhere(actor, f);
  const pageSize = f.pageSize ?? 25;
  const page = Math.max(1, f.page ?? 1);
  const order =
    f.sort === "oldest"
      ? [asc(enquiries.createdAt)]
      : f.sort === "followup"
        ? [sql`${enquiries.followUpAt} asc nulls last`, desc(enquiries.createdAt)]
        : [desc(enquiries.createdAt)];
  const rows = await db
    .select(leadSelect)
    .from(enquiries)
    .leftJoin(packages, eq(packages.id, enquiries.packageId))
    .leftJoin(destinations, eq(destinations.id, enquiries.destinationId))
    .leftJoin(users, eq(users.id, enquiries.assigneeId))
    .where(where)
    .orderBy(...order)
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(enquiries).where(where);
  return { rows, total: n, page, pages: Math.max(1, Math.ceil(n / pageSize)) };
}

export async function tabCounts(db: DB, actor: StaffUser) {
  const tabs = ["all", "new", "mine", "followups", "unassigned"] as const;
  const out = {} as Record<(typeof tabs)[number], number>;
  for (const tab of tabs) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(enquiries)
      .where(buildWhere(actor, { tab }));
    out[tab] = n;
  }
  return out;
}

async function loadForWrite(db: DB, actor: StaffUser, id: number) {
  if (!can(actor.role, "leads.edit")) throw new ForbiddenError("leads.edit");
  const [lead] = await db.select().from(enquiries).where(and(eq(enquiries.id, id), scope(actor)));
  if (!lead) throw new LeadError("Lead not found or not assigned to you.", 404);
  return lead;
}

export async function getLead(db: DB, actor: StaffUser, id: number) {
  if (!can(actor.role, "leads.view")) throw new ForbiddenError("leads.view");
  const [row] = await db
    .select(leadSelect)
    .from(enquiries)
    .leftJoin(packages, eq(packages.id, enquiries.packageId))
    .leftJoin(destinations, eq(destinations.id, enquiries.destinationId))
    .leftJoin(users, eq(users.id, enquiries.assigneeId))
    .where(and(eq(enquiries.id, id), scope(actor)));
  if (!row) return null;
  const activity = await db
    .select({ a: leadActivities, actorName: users.name })
    .from(leadActivities)
    .leftJoin(users, eq(users.id, leadActivities.actorId))
    .where(eq(leadActivities.enquiryId, id))
    .orderBy(desc(leadActivities.createdAt), desc(leadActivities.id));
  return { ...row, activity };
}

async function log(db: DB, enquiryId: number, actor: StaffUser | null, kind: string, body: string) {
  await db.insert(leadActivities).values({ enquiryId, actorId: actor?.id ?? null, kind, body });
}

const label = (s: LeadStatus) => leadStatuses.find((x) => x.value === s)!.label;

export async function changeStatus(
  db: DB,
  actor: StaffUser,
  id: number,
  status: LeadStatus,
  opts: { lostReason?: string; quotedAmount?: number; note?: string } = {},
) {
  const lead = await loadForWrite(db, actor, id);
  if (!leadStatuses.some((s) => s.value === status)) throw new LeadError("Unknown status.");
  if (status === "lost" && !opts.lostReason?.trim()) throw new LeadError("Pick a reason before marking a lead as lost.");
  if (status === "quoted" && opts.quotedAmount != null && (!Number.isFinite(opts.quotedAmount) || opts.quotedAmount < 0))
    throw new LeadError("Quoted amount must be a positive number.");
  if (lead.status === status) return lead;
  const now = new Date();
  const [updated] = await db
    .update(enquiries)
    .set({
      status,
      lostReason: status === "lost" ? opts.lostReason!.trim() : null,
      quotedAmount: status === "quoted" ? (opts.quotedAmount ?? lead.quotedAmount) : lead.quotedAmount,
      firstContactAt: lead.firstContactAt ?? (status !== "new" ? now : null),
      followUpAt: status === "converted" || status === "lost" ? null : lead.followUpAt,
      updatedAt: now,
    })
    .where(eq(enquiries.id, id))
    .returning();
  await log(
    db,
    id,
    actor,
    "status",
    `changed status ${label(lead.status)} → ${label(status)}${status === "lost" ? ` · ${opts.lostReason}` : ""}${opts.note ? ` — ${opts.note}` : ""}`,
  );
  return updated;
}

export async function assignLead(db: DB, actor: StaffUser, id: number, assigneeId: number | null) {
  const lead = await loadForWrite(db, actor, id);
  const selfClaim = assigneeId === actor.id && lead.assigneeId == null;
  if (!can(actor.role, "leads.assign") && !selfClaim) throw new ForbiddenError("leads.assign");
  let assigneeName = "nobody";
  if (assigneeId != null) {
    const [u] = await db.select().from(users).where(eq(users.id, assigneeId));
    if (!u || u.status === "deactivated") throw new LeadError("That teammate can't take leads.");
    assigneeName = u.name;
  }
  const [updated] = await db
    .update(enquiries)
    .set({ assigneeId, updatedAt: new Date() })
    .where(eq(enquiries.id, id))
    .returning();
  await log(db, id, actor, "assign", assigneeId == null ? "unassigned the lead" : `assigned to ${assigneeName}`);
  return updated;
}

export async function setFollowUp(db: DB, actor: StaffUser, id: number, at: Date | null, note?: string) {
  await loadForWrite(db, actor, id);
  if (at && Number.isNaN(at.getTime())) throw new LeadError("Pick a valid date and time.");
  const [updated] = await db
    .update(enquiries)
    .set({ followUpAt: at, updatedAt: new Date() })
    .where(eq(enquiries.id, id))
    .returning();
  await log(
    db,
    id,
    actor,
    "followup",
    at
      ? `set a follow-up for ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(at)}${note ? ` — ${note}` : ""}`
      : "marked the follow-up done",
  );
  return updated;
}

export async function addActivity(
  db: DB,
  actor: StaffUser,
  id: number,
  kind: "note" | "call" | "whatsapp" | "email",
  body: string,
) {
  const lead = await loadForWrite(db, actor, id);
  const text = body.trim().slice(0, 2000);
  if (!text && kind === "note") throw new LeadError("Write something first.");
  const verb = { note: "added a note", call: "logged a call", whatsapp: "opened WhatsApp chat", email: "logged an email" }[kind];
  await log(db, id, actor, kind, text ? `${verb} · ${text}` : verb);
  if ((kind === "call" || kind === "whatsapp") && !lead.firstContactAt) {
    await db.update(enquiries).set({ firstContactAt: new Date() }).where(eq(enquiries.id, id));
  }
}

export async function bulkUpdate(
  db: DB,
  actor: StaffUser,
  ids: number[],
  action: { status?: LeadStatus; lostReason?: string; assigneeId?: number | null },
) {
  let n = 0;
  for (const id of ids.slice(0, 200)) {
    if (action.status) await changeStatus(db, actor, id, action.status, { lostReason: action.lostReason });
    if (action.assigneeId !== undefined) await assignLead(db, actor, id, action.assigneeId);
    n++;
  }
  return n;
}

export async function createManualLead(
  db: DB,
  actor: StaffUser,
  input: { name: string; phone: string; email?: string; packageId?: number; source?: string; message?: string },
) {
  if (!can(actor.role, "leads.edit")) throw new ForbiddenError("leads.edit");
  const phone = normalisePhone(input.phone);
  if (!input.name?.trim() || input.name.trim().length < 2) throw new LeadError("Name is required.");
  if (!phone) throw new LeadError("Enter a valid phone number.");
  let destinationId: number | null = null;
  if (input.packageId) {
    const [p] = await db.select().from(packages).where(eq(packages.id, input.packageId));
    destinationId = p?.destinationId ?? null;
  }
  const [lead] = await db
    .insert(enquiries)
    .values({
      reference: `SFS-${Math.floor(10000 + Math.random() * 90000)}`,
      kind: input.packageId ? "package" : "contact",
      name: input.name.trim(),
      phone,
      email: input.email?.trim() || null,
      consent: true,
      packageId: input.packageId ?? null,
      destinationId,
      source: input.source || "phone",
      message: input.message ?? null,
      assigneeId: can(actor.role, "leads.assign") ? null : actor.id,
      emailStatus: "sent",
    })
    .returning();
  await log(db, lead.id, actor, "created", `added the lead manually (${lead.source})`);
  return lead;
}

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Prevent CSV formula injection when opened in Excel/Sheets.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function exportLeadsCsv(db: DB, actor: StaffUser, f: LeadFilters = {}) {
  if (!can(actor.role, "leads.export")) throw new ForbiddenError("leads.export");
  const { rows } = await listLeads(db, actor, { ...f, page: 1, pageSize: 10_000 });
  const header = [
    "Reference", "Created", "Name", "Phone", "Email", "Package", "Destination", "Travel", "Adults", "Children",
    "Budget", "Status", "Lost reason", "Quoted (INR)", "Owner", "Follow-up", "Source", "UTM campaign",
  ];
  const lines = rows.map(({ lead, pkgTitle, destName, assigneeName }) =>
    [
      lead.reference, lead.createdAt.toISOString(), lead.name, lead.phone, lead.email, pkgTitle ?? (lead.kind === "custom" ? "Custom trip" : ""),
      destName, lead.travelMonth, lead.adults, lead.children, lead.budget, lead.status, lead.lostReason, lead.quotedAmount,
      assigneeName, lead.followUpAt?.toISOString(), lead.source, lead.utm?.utm_campaign,
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export async function assignableStaff(db: DB) {
  return db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(inArray(users.status, ["active", "invited"]))
    .orderBy(asc(users.name));
}
