import Link from "next/link";
import { getDb } from "@/db";
import { requirePageUser } from "@/lib/session";
import { adminPackageList } from "@/lib/admin-catalogue";
import { can } from "@/lib/permissions";
import { formatINR, timeAgo } from "@/lib/format";
import { PageHeader, PubBadge, Th, Td, abtn, Empty } from "@/components/admin/ui";
import { PlusIcon } from "@/components/ui/icons";

export const metadata = { title: "Packages" };

export default async function PackagesAdmin({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const user = await requirePageUser();
  const sp = await searchParams;
  const all = await adminPackageList(await getDb());
  const rows = all.filter((r) => (!sp.status || sp.status === "all" || r.p.status === sp.status) && (!sp.q || `${r.p.title} ${r.destName}`.toLowerCase().includes(sp.q.toLowerCase())));
  const count = (s: string) => all.filter((r) => r.p.status === s).length;
  const editable = can(user.role, "catalogue.edit");
  const tabs = [["all", "All", all.length], ["published", "Published", count("published")], ["draft", "Drafts", count("draft")], ["unpublished", "Unpublished", count("unpublished")], ["archived", "Archived", count("archived")]] as const;
  return (
    <div>
      <PageHeader
        title="Packages"
        subtitle={`${count("published")} live on the site · ${count("draft")} draft${count("draft") === 1 ? "" : "s"}`}
        actions={editable ? <Link href="/admin/packages/new" className={abtn.primary}><PlusIcon /> New package</Link> : <span className="text-[13px] text-stone">Read-only for your role</span>}
      />
      <div className="rounded-[8px] border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6">
          <nav className="flex gap-6 overflow-x-auto" aria-label="Package status">
            {tabs.map(([v, l, n]) => {
              const active = (sp.status ?? "all") === v;
              return <Link key={v} href={`/admin/packages${v === "all" ? "" : `?status=${v}`}`} aria-current={active ? "page" : undefined} className={`flex items-center gap-2 border-b-2 py-4 text-[15px] ${active ? "border-teal font-medium text-teal" : "border-transparent"}`}>{l}<span className="rounded bg-admin-bg px-1.5 text-[12px] text-stone">{n}</span></Link>;
            })}
          </nav>
          <form className="py-3"><input name="q" defaultValue={sp.q} placeholder="Search packages" aria-label="Search packages" className="rounded-[4px] border border-line px-3 py-2 text-[14px]" />{sp.status && <input type="hidden" name="status" value={sp.status} />}</form>
        </div>
        {rows.length === 0 ? (
          <Empty title="No packages here" body="Create a package, or switch tabs." action={editable ? <Link href="/admin/packages/new" className={abtn.primary}>New package</Link> : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-line"><tr><Th>Package</Th><Th>Destination</Th><Th>Duration</Th><Th className="text-right">From</Th><Th>Departures</Th><Th className="text-right">Enquiries</Th><Th>Status</Th><Th>Updated</Th></tr></thead>
              <tbody>
                {rows.map(({ p, destName, deps, enquiries }) => (
                  <tr key={p.id} className="border-b border-line last:border-0 hover:bg-admin-bg/60">
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="h-10 w-14 shrink-0 rounded-[2px]" style={{ backgroundColor: p.photos[0]?.color ?? "#E0DCC0" }} aria-hidden />
                        <div>
                          <Link href={`/admin/packages/${p.id}`} className="font-medium hover:underline">{p.title}</Link>
                          <span className="block text-[12px] text-stone">/packages/{p.slug}{p.featured ? " · Featured" : ""}</span>
                        </div>
                      </div>
                    </Td>
                    <Td>{destName}</Td>
                    <Td>{p.nights}N/{p.nights + 1}D</Td>
                    <Td className="text-right">{formatINR(p.priceFrom)}</Td>
                    <Td>{deps ? `${deps} open` : <span className="text-stone">On request</span>}</Td>
                    <Td className="text-right">{enquiries}</Td>
                    <Td><PubBadge status={p.status} /></Td>
                    <Td className="text-stone">{timeAgo(p.updatedAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
