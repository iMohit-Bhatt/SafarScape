import { getDb } from "@/db";
import { requirePageUser } from "@/lib/session";
import { periodFromKey, statusBreakdown, sourceBreakdown, packagePerformance, lostReasonsBreakdown, dailySeries, medianFirstResponseHours, conversionRate, CONVERSION_DEFINITION } from "@/lib/reports";
import { Card, PageHeader, Th, Td } from "@/components/admin/ui";
import { PeriodSelect } from "@/components/admin/PeriodSelect";

export const metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requirePageUser("reports.view");
  const { period = "30d" } = await searchParams;
  const p = periodFromKey(period);
  const db = await getDb();
  const [status, sources, pkgs, lost, series, median] = await Promise.all([statusBreakdown(db, p), sourceBreakdown(db, p), packagePerformance(db, p), lostReasonsBreakdown(db, p), dailySeries(db, p), medianFirstResponseHours(db, p)]);
  const rate = conversionRate(status.converted, status.total);
  const max = Math.max(1, ...series.map((s) => s.n));
  const days: { day: string; n: number }[] = [];
  for (let t = new Date(p.from); t <= p.to; t = new Date(t.getTime() + 86400_000)) {
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(t);
    days.push({ day: key, n: series.find((s) => s.day === key)?.n ?? 0 });
  }
  const tile = (l: string, v: React.ReactNode, s?: string) => (
    <div className="rounded-[8px] border border-line bg-white p-5"><p className="text-[12px] uppercase tracking-[0.12em] text-stone">{l}</p><p className="font-display text-[34px] text-charcoal">{v}</p>{s && <p className="text-[13px] text-stone">{s}</p>}</div>
  );
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reports" subtitle={`Leads created ${p.label}. Each lead counts in the period it arrived.`} actions={<PeriodSelect value={period} />} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tile("Leads created", status.total)}
        {tile("Converted", status.converted)}
        {tile("Conversion rate", `${rate}%`, CONVERSION_DEFINITION)}
        {tile("Median first reply", median == null ? "—" : `${median}h`, "Time from enquiry to first call, WhatsApp or status change")}
      </div>
      <Card title="Enquiries per day">
        <div className="flex h-[160px] items-end gap-[2px]" role="img" aria-label="Enquiries per day">
          {days.map((d) => <span key={d.day} title={`${d.day}: ${d.n}`} className="flex-1 rounded-t-[2px] bg-teal-soft" style={{ height: `${Math.max(2, (d.n / max) * 100)}%`, opacity: d.n ? 1 : 0.25 }} />)}
        </div>
        <div className="mt-2 flex justify-between text-[12px] text-stone"><span>{days[0]?.day}</span><span>{days.at(-1)?.day}</span></div>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card pad={false} title="By source">
          <table className="w-full"><thead className="border-b border-line"><tr><Th>Source</Th><Th className="text-right">Leads</Th><Th className="text-right">Converted</Th><Th className="text-right">Conversion</Th></tr></thead>
            <tbody>{sources.map((s) => <tr key={s.source} className="border-b border-line last:border-0"><Td className="capitalize">{s.source}</Td><Td className="text-right">{s.n}</Td><Td className="text-right">{s.converted}</Td><Td className="text-right">{s.rate}%</Td></tr>)}</tbody>
          </table>
        </Card>
        <Card title="Pipeline">
          <ul className="flex flex-col gap-3">
            {(["new", "contacted", "quoted", "converted", "lost"] as const).map((k) => (
              <li key={k} className="grid grid-cols-[100px_1fr_40px] items-center gap-3 text-[14px] capitalize"><span>{k}</span><span className="h-2 rounded-full bg-admin-bg"><span className="block h-2 rounded-full bg-teal" style={{ width: `${status.total ? (status[k] / status.total) * 100 : 0}%` }} /></span><span className="text-right">{status[k]}</span></li>
            ))}
          </ul>
          <h3 className="mt-6 text-[14px] font-medium">Why leads were lost</h3>
          <ul className="mt-2 flex flex-col gap-1 text-[14px]">{lost.length ? lost.map((l) => <li key={l.reason ?? "?"} className="flex justify-between"><span>{l.reason ?? "No reason"}</span><span>{l.n}</span></li>) : <li className="text-stone">No lost leads in this period.</li>}</ul>
        </Card>
      </div>
      <Card pad={false} title="Packages">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]"><thead className="border-b border-line"><tr><Th>Package</Th><Th>Destination</Th><Th className="text-right">Enquiries</Th><Th className="text-right">Quoted</Th><Th className="text-right">Converted</Th><Th className="text-right">Conversion</Th></tr></thead>
            <tbody>{pkgs.map((r) => <tr key={r.id} className="border-b border-line last:border-0"><Td>{r.title}</Td><Td>{r.dest}</Td><Td className="text-right">{r.n}</Td><Td className="text-right">{r.quoted}</Td><Td className="text-right">{r.converted}</Td><Td className="text-right">{r.rate}%</Td></tr>)}
              {pkgs.length === 0 && <tr><Td className="text-stone">No package enquiries in this period.</Td></tr>}</tbody>
          </table>
        </div>
      </Card>
      <p className="text-[13px] text-stone">Conversion rate = leads created in the period that are now Converted ÷ all leads created in the period. Custom-trip and contact enquiries are included in totals but not in the package table.</p>
    </div>
  );
}
