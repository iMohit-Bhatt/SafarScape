import Link from "next/link";
import { getDb } from "@/db";
import { requirePageUser } from "@/lib/session";
import { adminDestinationList } from "@/lib/admin-catalogue";
import { can } from "@/lib/permissions";
import { timeAgo } from "@/lib/format";
import { PageHeader, PubBadge, Th, Td, abtn } from "@/components/admin/ui";
import { PlusIcon } from "@/components/ui/icons";

export const metadata = { title: "Destinations" };

export default async function DestinationsAdmin() {
  const user = await requirePageUser();
  const rows = await adminDestinationList(await getDb());
  return (
    <div>
      <PageHeader title="Destinations" subtitle="Each destination has its own page with seasons, travel info and every package there." actions={can(user.role, "catalogue.edit") ? <Link href="/admin/destinations/new" className={abtn.primary}><PlusIcon /> New destination</Link> : undefined} />
      <div className="overflow-x-auto rounded-[8px] border border-line bg-white">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-line"><tr><Th>Destination</Th><Th>Region</Th><Th>Best months</Th><Th>Packages</Th><Th>Status</Th><Th>Updated</Th></tr></thead>
          <tbody>
            {rows.map(({ d, live, total }) => (
              <tr key={d.id} className="border-b border-line last:border-0 hover:bg-admin-bg/60">
                <Td><div className="flex items-center gap-3"><span className="h-9 w-12 rounded-[2px]" style={{ backgroundColor: d.hero.color }} aria-hidden /><Link href={`/admin/destinations/${d.id}`} className="font-medium hover:underline">{d.name}</Link></div></Td>
                <Td>{d.region}</Td>
                <Td>{d.bestMonths || "—"}</Td>
                <Td>{live} live{total > live ? ` · ${total - live} other` : ""}</Td>
                <Td><PubBadge status={d.status} /></Td>
                <Td className="text-stone">{timeAgo(d.updatedAt)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
