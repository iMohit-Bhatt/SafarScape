import Link from "next/link";
import { getDb } from "@/db";
import { requirePageUser } from "@/lib/session";
import { dashboardData, CONVERSION_DEFINITION } from "@/lib/reports";
import { can } from "@/lib/permissions";
import { formatDate, timeAgo, durationLabel, displayPhone } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";
import { Card, Th, Td, abtn, SourceDot, Empty } from "@/components/admin/ui";
import { PhoneIcon, WhatsAppIcon, PlusIcon } from "@/components/ui/icons";
import { PeriodSelect } from "@/components/admin/PeriodSelect";

export const metadata = { title: "Dashboard" };

const statusColors = { new: "#0E3B43", contacted: "#C9A227", quoted: "#A39A70", converted: "#3E6B48", lost: "#C27A6E" } as const;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await requirePageUser();
  const { period = "7d" } = await searchParams;
  const d = await dashboardData(await getDb(), user, period);
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(new Date()));
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const change = d.prevPeriod ? Math.round(((d.thisPeriod - d.prevPeriod) / d.prevPeriod) * 100) : null;
  const maxSource = Math.max(1, ...d.sources.map((s) => s.n));

  const stat = (label: string, value: React.ReactNode, sub: React.ReactNode, highlight?: boolean, href?: string) => {
    const inner = (
      <div className={`flex h-full flex-col gap-2 rounded-[8px] border p-5 ${highlight ? "border-gold/50 bg-[#FBF6E6]" : "border-line bg-white"}`}>
        <p className={`text-[12px] tracking-[0.12em] uppercase ${highlight ? "text-warning" : "text-stone"}`}>{label}</p>
        <p className={`font-display text-[34px] leading-[40px] ${highlight ? "text-warning" : "text-charcoal"}`}>{value}</p>
        <p className={`text-[13px] ${highlight ? "text-warning" : "text-stone"}`}>{sub}</p>
      </div>
    );
    return href ? <Link href={href} className="block">{inner}</Link> : inner;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-[28px] leading-[34px] text-teal">{greet}, {user.name.split(" ")[0]}</h1>
          <p className="text-[15px] text-stone">
            {formatDate(new Date())} · {d.awaiting} lead{d.awaiting === 1 ? " is" : "s are"} waiting for a first reply
          </p>
        </div>
        <div className="flex gap-2.5">
          <PeriodSelect value={period} />
          <Link href="/admin/leads/new" className={abtn.primary}><PlusIcon /> Add lead</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stat("New enquiries today", d.newToday, <><span className="rounded bg-success-bg px-1 text-success">{d.newToday - d.newYesterday >= 0 ? "+" : ""}{d.newToday - d.newYesterday}</span> vs {d.newYesterday} yesterday</>)}
        {stat(d.period.label === "last 7 days" ? "This week" : d.period.label, d.thisPeriod, change == null ? "no earlier data" : `${change >= 0 ? "↑" : "↓"} ${Math.abs(change)}% vs ${d.prevPeriod} prev.`)}
        {stat("• Awaiting contact", d.awaiting, `${d.awaiting24} waiting 24h+`, d.awaiting > 0, "/admin/leads?tab=new")}
        {stat("Follow-ups due", d.followDue, `${d.overdueFollowUps} overdue`, false, "/admin/leads?tab=followups")}
        {stat(`Converted · ${d.monthLabel}`, <>{d.convertedMonth} <span className="text-[16px] text-success">{d.conversion}%</span></>, <span title={CONVERSION_DEFINITION}>of {d.createdMonth} leads created in {d.monthLabel} ⓘ</span>)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card
          pad={false}
          title={<h2 className="flex items-center gap-2.5 text-[17px] font-medium">Leads awaiting contact <span className="rounded bg-warning-bg px-2 text-[13px] text-warning">{d.awaiting}</span></h2>}
          action={<Link href="/admin/leads?tab=new" className={abtn.ghost}>View all {d.awaiting} →</Link>}
        >
          {d.awaitingList.length === 0 ? (
            <Empty title="Inbox zero" body="Every new enquiry has had a first reply. Nice." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="border-b border-line"><tr><Th>Name</Th><Th>Package</Th><Th>Source</Th><Th>Waiting</Th><Th className="text-right">Reach out</Th></tr></thead>
                <tbody>
                  {d.awaitingList.map(({ lead, pkgTitle, pkgNights, destName }) => {
                    const hours = (d.period.to.getTime() - lead.createdAt.getTime()) / 3600_000;
                    const wa = whatsappLink(lead.phone, `Hi ${lead.name.replace("Demo lead · ", "").split(" ")[0]}, this is ${user.name.split(" ")[0]} from Safarscape about your enquiry ${lead.reference}.`);
                    return (
                      <tr key={lead.id} className="border-b border-line last:border-0">
                        <Td><Link href={`/admin/leads/${lead.id}`} className="hover:underline">{lead.name}</Link></Td>
                        <Td>{pkgTitle ? `${pkgTitle} · ${durationLabel(pkgNights!).split("/")[0]}` : lead.kind === "custom" ? "Custom trip" : (destName ?? "General")}</Td>
                        <Td><SourceDot source={lead.source} /></Td>
                        <Td>{hours >= 24 ? <span className="rounded bg-danger-bg px-2 py-0.5 text-[13px] text-danger">{timeAgo(lead.createdAt).replace(" ago", "")} · overdue</span> : timeAgo(lead.createdAt)}</Td>
                        <Td className="text-right">
                          <span className="inline-flex gap-2">
                            <a href={`tel:${lead.phone}`} aria-label={`Call ${displayPhone(lead.phone)}`} className="rounded-[4px] border border-line p-2"><PhoneIcon /></a>
                            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="rounded-[4px] bg-success-bg p-2 text-whatsapp"><WhatsAppIcon /></a>}
                          </span>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card pad={false} title="Follow-ups today" action={<Link href="/admin/leads?tab=followups" className={abtn.ghost}>All</Link>}>
          {d.followUps.length === 0 ? (
            <p className="p-6 text-[14px] text-stone">No follow-ups scheduled for today.</p>
          ) : (
            <ul>
              {d.followUps.map(({ lead }) => {
                const overdue = lead.followUpAt! < new Date();
                return (
                  <li key={lead.id} className={`flex items-center gap-4 border-b border-line px-6 py-3.5 last:border-0 ${overdue ? "bg-danger-bg/40" : ""}`}>
                    <span className={`w-[70px] text-[14px] ${overdue ? "text-danger" : "text-charcoal"}`}>
                      {new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(lead.followUpAt!)}
                    </span>
                    <Link href={`/admin/leads/${lead.id}`} className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px] text-charcoal">{lead.name}</span>
                      <span className="text-[13px] capitalize text-stone">{lead.status}{overdue ? " · overdue" : ""}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card title="Leads by status" action={<span className="text-[13px] text-stone">{d.status.total} leads created · {d.period.label}</span>}>
          {d.status.total === 0 ? (
            <p className="text-[14px] text-stone">No leads in this period yet.</p>
          ) : (
            <>
              <div className="flex h-7 gap-0.5 overflow-hidden rounded-[4px]" role="img" aria-label="Leads by status">
                {(Object.keys(statusColors) as (keyof typeof statusColors)[]).map((k) =>
                  d.status[k] ? <span key={k} style={{ flex: d.status[k], backgroundColor: statusColors[k] }} title={`${k}: ${d.status[k]}`} /> : null,
                )}
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-5">
                {(Object.keys(statusColors) as (keyof typeof statusColors)[]).map((k) => (
                  <div key={k}>
                    <dt className="flex items-center gap-1.5 text-[13px] capitalize text-stone"><span className="h-2 w-2" style={{ backgroundColor: statusColors[k] }} />{k}</dt>
                    <dd className="font-display text-[24px] text-charcoal">{d.status[k]}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 border-t border-line pt-4 text-[13px] text-stone">
                {d.status.new + d.status.contacted + d.status.quoted} still open · {d.status.converted} converted · {d.status.lost} lost
                {d.lost[0]?.reason && <> — top loss reason: <strong className="text-charcoal">{d.lost[0].reason} ({d.lost[0].n})</strong></>}
              </p>
            </>
          )}
        </Card>
        <Card title="Enquiries by source" action={<span className="text-[13px] text-stone">{d.thisPeriod}</span>}>
          <ul className="flex flex-col gap-2.5">
            {d.sources.map((s) => (
              <li key={s.source} className="grid grid-cols-[96px_1fr_28px] items-center gap-3 text-[14px]">
                <span className="capitalize text-charcoal">{s.source}</span>
                <span className="h-1.5 rounded-full bg-admin-bg"><span className="block h-1.5 rounded-full bg-teal-soft" style={{ width: `${(s.n / maxSource) * 100}%` }} /></span>
                <span className="text-right font-medium">{s.n}</span>
              </li>
            ))}
            {d.sources.length === 0 && <li className="text-[14px] text-stone">No enquiries in this period.</li>}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card pad={false} title="Package performance" action={<span className="text-[13px] text-stone">{d.period.label}</span>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="border-b border-line"><tr><Th>Package</Th><Th className="text-right">Enquiries</Th><Th className="text-right">Quoted</Th><Th className="text-right">Converted</Th><Th className="text-right">Conversion</Th></tr></thead>
              <tbody>
                {d.packages.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <Td>{p.title} · {p.nights}N</Td>
                    <Td className="text-right">{p.n}</Td>
                    <Td className="text-right">{p.quoted}</Td>
                    <Td className="text-right">{p.converted}</Td>
                    <Td className="text-right font-medium">{p.rate}%</Td>
                  </tr>
                ))}
                {d.packages.length === 0 && <tr><Td className="text-stone">No package enquiries in this period.</Td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Recent activity">
          <ul className="flex flex-col gap-4">
            {d.recent.map(({ a, actorName, leadName, leadId }) => (
              <li key={a.id} className="flex gap-3 text-[14px]">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.kind === "status" ? "bg-gold" : a.kind === "created" ? "bg-teal" : "bg-success"}`} />
                <div>
                  <Link href={`/admin/leads/${leadId}`} className="text-charcoal hover:underline">{actorName ? `${actorName} ` : ""}{a.body.split(" · ")[0]} · {leadName.replace("Demo lead · ", "")}</Link>
                  <p className="text-[12px] text-stone">{timeAgo(a.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      {!can(user.role, "leads.viewAll") && <p className="text-[13px] text-stone">Figures show your leads and the unassigned queue.</p>}
    </div>
  );
}
