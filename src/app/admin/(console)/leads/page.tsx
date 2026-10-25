import Link from "next/link";
import { getDb } from "@/db";
import { requirePageUser } from "@/lib/session";
import { listLeads, tabCounts, assignableStaff, lostReasons } from "@/lib/leads";
import { can } from "@/lib/permissions";
import { PageHeader, abtn } from "@/components/admin/ui";
import { PlusIcon } from "@/components/ui/icons";
import { parseLeadFilters } from "./filters";
import { LeadsTable } from "./LeadsTable";
import { LeadFilterBar } from "./LeadFilterBar";

export const metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePageUser("leads.view");
  const sp = await searchParams;
  const f = parseLeadFilters(sp);
  const db = await getDb();
  const [data, counts, staff] = await Promise.all([listLeads(db, user, f), tabCounts(db, user), assignableStaff(db)]);
  const qs = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (v ? [[k, Array.isArray(v) ? v[0] : v]] : [])));
  const tabs = [
    ["all", "All"],
    ["new", "New"],
    ["mine", "My leads"],
    ["followups", "Follow-ups due"],
    ["unassigned", "Unassigned"],
  ] as const;
  const tabHref = (t: string) => `/admin/leads${t === "all" ? "" : `?tab=${t}`}`;
  qs.delete("page");
  const exportHref = `/admin/leads/export?${qs}`;

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={`Every enquiry from the website, WhatsApp and phone. ${counts.followups} follow-up${counts.followups === 1 ? " is" : "s are"} due.`}
        actions={
          <>
            {can(user.role, "leads.export") && <a href={exportHref} className={abtn.secondary} download>Export CSV</a>}
            <Link href="/admin/leads/new" className={abtn.primary}><PlusIcon /> Add lead</Link>
          </>
        }
      />
      <div className="rounded-[8px] border border-line bg-white">
        <nav aria-label="Lead views" className="flex gap-6 overflow-x-auto border-b border-line px-6">
          {tabs.map(([t, label]) => {
            const active = (f.tab ?? "all") === t;
            return (
              <Link key={t} href={tabHref(t)} aria-current={active ? "page" : undefined} className={`flex shrink-0 items-center gap-2 border-b-2 py-4 text-[15px] ${active ? "border-teal font-medium text-teal" : "border-transparent text-charcoal"}`}>
                {label}
                <span className={`rounded px-1.5 text-[12px] ${t === "followups" && counts[t] ? "bg-danger-bg text-danger" : "bg-admin-bg text-stone"}`}>{counts[t]}</span>
              </Link>
            );
          })}
        </nav>
        <LeadFilterBar staff={staff} total={data.total} />
        <LeadsTable
          rows={data.rows.map(({ lead, pkgTitle, pkgNights, destName, assigneeName }) => ({
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
            reference: lead.reference,
            pkg: pkgTitle ?? (lead.kind === "custom" ? "Custom trip enquiry" : lead.kind === "contact" ? "General enquiry" : "Destination enquiry"),
            sub: [destName, pkgNights ? `${pkgNights}N/${pkgNights + 1}D` : null].filter(Boolean).join(" · "),
            travel: lead.travelMonth,
            pax: `${lead.adults}A${lead.children ? ` · ${lead.children}C` : ""}`,
            source: lead.source,
            status: lead.status,
            owner: assigneeName,
            followUpAt: lead.followUpAt?.toISOString() ?? null,
            createdAt: lead.createdAt.toISOString(),
            emailFailed: lead.emailStatus === "failed",
          }))}
          staff={staff}
          lostReasons={lostReasons}
          canAssign={can(user.role, "leads.assign")}
          canExport={can(user.role, "leads.export")}
          exportHref={exportHref}
        />
        <div className="flex items-center justify-between border-t border-line px-6 py-4 text-[14px] text-stone">
          <span>{data.total ? `${(data.page - 1) * 25 + 1}–${(data.page - 1) * 25 + data.rows.length} of ${data.total}` : "No leads"}</span>
          <div className="flex gap-2">
            {data.page > 1 && <Link className={abtn.small} href={`/admin/leads?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(data.page - 1) })}`}>‹ Prev</Link>}
            <span className="rounded-[4px] bg-teal px-3 py-1.5 text-[13px] text-ivory">{data.page}</span>
            {data.page < data.pages && <Link className={abtn.small} href={`/admin/leads?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(data.page + 1) })}`}>Next ›</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}
