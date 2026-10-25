import { requirePageUser } from "@/lib/session";
import { roleLabels } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { AccountForms } from "./AccountForms";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const u = await requirePageUser();
  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <PageHeader title="My account" subtitle={`${u.email} · ${roleLabels[u.role]}`} />
      <AccountForms name={u.name} phone={u.phone ?? ""} />
    </div>
  );
}
