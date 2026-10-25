import { getDb } from "@/db";
import { requirePageUser } from "@/lib/session";
import { listTeam } from "@/lib/admin-team";
import { capabilities, roleDescriptions, roleLabels } from "@/lib/permissions";
import { PageHeader, Card } from "@/components/admin/ui";
import { TeamManager } from "./TeamManager";

export const metadata = { title: "Team & roles" };

const capLabels: Record<string, string> = {
  "leads.view": "See leads", "leads.viewAll": "See everyone's leads", "leads.edit": "Update leads", "leads.assign": "Assign leads", "leads.export": "Export CSV",
  "leads.delete": "Delete leads", "catalogue.edit": "Edit packages & destinations", "catalogue.publish": "Publish packages", "content.edit": "Edit blog, gallery, banners",
  "testimonials.approve": "Approve testimonials", "reports.view": "View reports", "settings.team": "Manage team & roles", "settings.email": "Email routing", "settings.agency": "Agency & WhatsApp",
};

export default async function TeamPage() {
  const me = await requirePageUser("settings.team");
  const team = await listTeam(await getDb());
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Team & roles" subtitle="Invite teammates and choose what each role can do. Roles are enforced on the server." />
      <TeamManager meId={me.id} members={team.map(({ u, openLeads }) => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, openLeads, lastActiveAt: u.lastActiveAt?.toISOString() ?? null }))} />
      <Card pad={false} title="What each role can do">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[14px]">
            <thead className="border-b border-line"><tr><th className="px-6 py-3 text-left font-normal text-stone">Permission</th>{(["owner", "manager", "sales"] as const).map((r) => <th key={r} className="px-4 py-3 text-center font-medium">{roleLabels[r]}</th>)}</tr></thead>
            <tbody>
              {Object.entries(capabilities).map(([cap, roles]) => (
                <tr key={cap} className="border-b border-line last:border-0">
                  <td className="px-6 py-2.5">{capLabels[cap] ?? cap}</td>
                  {(["owner", "manager", "sales"] as const).map((r) => <td key={r} className="px-4 py-2.5 text-center">{(roles as readonly string[]).includes(r) ? <span className="text-success">✓</span> : <span className="text-line">—</span>}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="grid gap-3 border-t border-line p-6 text-[13px] text-stone sm:grid-cols-3">{(["owner", "manager", "sales"] as const).map((r) => <li key={r}><strong className="text-charcoal">{roleLabels[r]}:</strong> {roleDescriptions[r]}</li>)}</ul>
      </Card>
    </div>
  );
}
