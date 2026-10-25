import { and, gte, lt, eq, sql, desc, isNull, inArray, lte } from "drizzle-orm";
import type { DB } from "@/db";
import { enquiries, packages, destinations, leadActivities, users, type LeadStatus } from "@/db/schema";
import type { StaffUser } from "./auth";
import { can } from "./permissions";

/**
 * Conversion rate definition (shown in the UI tooltip):
 *   leads created in the period that are now "converted"  ÷  all leads created in the period.
 * Leads are counted by their creation date, so a lead created in the period and converted later
 * still counts towards that period.
 */
export const CONVERSION_DEFINITION = "Converted ÷ leads created in period.";

export function conversionRate(converted: number, created: number): number {
  if (created <= 0) return 0;
  return Math.round((converted / created) * 1000) / 10;
}

export type Period = { from: Date; to: Date; label: string };

export function periodFromKey(key: string | undefined, now = new Date()): Period {
  const end = new Date(now);
  const days = key === "30d" ? 30 : key === "90d" ? 90 : key === "today" ? 1 : 7;
  if (key === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, to: end, label: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(now) };
  }
  const from = new Date(now);
  if (key === "today") from.setHours(0, 0, 0, 0);
  else from.setTime(now.getTime() - days * 86400_000);
  return { from, to: end, label: key === "today" ? "today" : `last ${days} days` };
}

export function previousPeriod(p: Period): Period {
  const span = p.to.getTime() - p.from.getTime();
  return { from: new Date(p.from.getTime() - span), to: new Date(p.from), label: "previous period" };
}

async function countWhere(db: DB, where: ReturnType<typeof and>) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(enquiries).where(where);
  return n;
}

const inPeriod = (p: Period) => and(gte(enquiries.createdAt, p.from), lt(enquiries.createdAt, p.to));

export async function statusBreakdown(db: DB, p: Period) {
  const rows = await db
    .select({ status: enquiries.status, n: sql<number>`count(*)::int` })
    .from(enquiries)
    .where(inPeriod(p))
    .groupBy(enquiries.status);
  const out: Record<LeadStatus, number> = { new: 0, contacted: 0, quoted: 0, converted: 0, lost: 0 };
  for (const r of rows) out[r.status] = r.n;
  const total = Object.values(out).reduce((a, b) => a + b, 0);
  return { ...out, total };
}

export async function sourceBreakdown(db: DB, p: Period) {
  const rows = await db
    .select({
      source: enquiries.source,
      n: sql<number>`count(*)::int`,
      converted: sql<number>`count(*) filter (where ${enquiries.status} = 'converted')::int`,
    })
    .from(enquiries)
    .where(inPeriod(p))
    .groupBy(enquiries.source)
    .orderBy(desc(sql`count(*)`));
  return rows.map((r) => ({ ...r, rate: conversionRate(r.converted, r.n) }));
}

export async function packagePerformance(db: DB, p: Period) {
  const rows = await db
    .select({
      id: packages.id,
      title: packages.title,
      nights: packages.nights,
      dest: destinations.name,
      n: sql<number>`count(${enquiries.id})::int`,
      quoted: sql<number>`count(*) filter (where ${enquiries.status} in ('quoted','converted'))::int`,
      converted: sql<number>`count(*) filter (where ${enquiries.status} = 'converted')::int`,
    })
    .from(enquiries)
    .innerJoin(packages, eq(packages.id, enquiries.packageId))
    .innerJoin(destinations, eq(destinations.id, packages.destinationId))
    .where(inPeriod(p))
    .groupBy(packages.id, packages.title, packages.nights, destinations.name)
    .orderBy(desc(sql`count(${enquiries.id})`));
  return rows.map((r) => ({ ...r, rate: conversionRate(r.converted, r.n) }));
}

export async function lostReasonsBreakdown(db: DB, p: Period) {
  return db
    .select({ reason: enquiries.lostReason, n: sql<number>`count(*)::int` })
    .from(enquiries)
    .where(and(inPeriod(p), eq(enquiries.status, "lost")))
    .groupBy(enquiries.lostReason)
    .orderBy(desc(sql`count(*)`));
}

export async function dailySeries(db: DB, p: Period) {
  const rows = await db
    .select({
      day: sql<string>`to_char(${enquiries.createdAt} at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`,
      n: sql<number>`count(*)::int`,
    })
    .from(enquiries)
    .where(inPeriod(p))
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  return rows;
}

export async function medianFirstResponseHours(db: DB, p: Period) {
  const [r] = await db
    .select({
      h: sql<number | null>`percentile_cont(0.5) within group (order by extract(epoch from (${enquiries.firstContactAt} - ${enquiries.createdAt})) / 3600)`,
    })
    .from(enquiries)
    .where(and(inPeriod(p), sql`${enquiries.firstContactAt} is not null`));
  return r?.h == null ? null : Math.round(r.h * 10) / 10;
}

export async function dashboardData(db: DB, actor: StaffUser, periodKey = "7d") {
  const p = periodFromKey(periodKey);
  const prev = previousPeriod(p);
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const startYesterday = new Date(startToday.getTime() - 86400_000);
  const endToday = new Date(startToday.getTime() + 86400_000);
  const scope = can(actor.role, "leads.viewAll")
    ? undefined
    : sql`(${enquiries.assigneeId} = ${actor.id} or ${enquiries.assigneeId} is null)`;
  const s = (w: ReturnType<typeof and>) => (scope ? and(scope, w) : w);

  const newToday = await countWhere(db, s(gte(enquiries.createdAt, startToday)));
  const newYesterday = await countWhere(db, s(and(gte(enquiries.createdAt, startYesterday), lt(enquiries.createdAt, startToday))));
  const thisPeriod = await countWhere(db, s(inPeriod(p)));
  const prevPeriod = await countWhere(db, s(inPeriod(prev)));
  const awaiting = await countWhere(db, s(eq(enquiries.status, "new")));
  const awaiting24 = await countWhere(
    db,
    s(and(eq(enquiries.status, "new"), lt(enquiries.createdAt, new Date(Date.now() - 86400_000)))),
  );
  const followDue = await countWhere(
    db,
    s(and(lt(enquiries.followUpAt, endToday), inArray(enquiries.status, ["new", "contacted", "quoted"]))),
  );
  const month = periodFromKey("month");
  const createdMonth = await countWhere(db, s(inPeriod(month)));
  const convertedMonth = await countWhere(db, s(and(inPeriod(month), eq(enquiries.status, "converted"))));

  const awaitingList = await db
    .select({ lead: enquiries, pkgTitle: packages.title, pkgNights: packages.nights, destName: destinations.name })
    .from(enquiries)
    .leftJoin(packages, eq(packages.id, enquiries.packageId))
    .leftJoin(destinations, eq(destinations.id, enquiries.destinationId))
    .where(s(eq(enquiries.status, "new")))
    .orderBy(enquiries.createdAt)
    .limit(5);

  const followUps = await db
    .select({ lead: enquiries })
    .from(enquiries)
    .where(s(and(gte(enquiries.followUpAt, startYesterday), lt(enquiries.followUpAt, endToday))))
    .orderBy(enquiries.followUpAt)
    .limit(6);

  const recent = await db
    .select({ a: leadActivities, actorName: users.name, leadName: enquiries.name, leadId: enquiries.id })
    .from(leadActivities)
    .innerJoin(enquiries, eq(enquiries.id, leadActivities.enquiryId))
    .leftJoin(users, eq(users.id, leadActivities.actorId))
    .where(scope)
    .orderBy(desc(leadActivities.createdAt))
    .limit(6);

  return {
    period: p,
    newToday,
    newYesterday,
    thisPeriod,
    prevPeriod,
    awaiting,
    awaiting24,
    followDue,
    createdMonth,
    convertedMonth,
    monthLabel: month.label,
    conversion: conversionRate(convertedMonth, createdMonth),
    awaitingList,
    followUps,
    recent,
    status: await statusBreakdown(db, p),
    sources: await sourceBreakdown(db, p),
    packages: (await packagePerformance(db, p)).slice(0, 5),
    lost: await lostReasonsBreakdown(db, p),
    unassigned: await countWhere(db, s(isNull(enquiries.assigneeId))),
    overdueFollowUps: await countWhere(
      db,
      s(and(lte(enquiries.followUpAt, new Date()), inArray(enquiries.status, ["new", "contacted", "quoted"]))),
    ),
  };
}
