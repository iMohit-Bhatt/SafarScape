import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { packages } from "@/db/schema";
import { requirePageUser } from "@/lib/session";
import { PageHeader, Card } from "@/components/admin/ui";
import { NewLeadForm } from "./NewLeadForm";

export const metadata = { title: "Add lead" };

export default async function NewLeadPage() {
  await requirePageUser("leads.edit");
  const pkgs = await (await getDb()).select({ id: packages.id, title: packages.title }).from(packages).where(eq(packages.status, "published"));
  return (
    <div className="max-w-[720px]">
      <PageHeader title="Add a lead" subtitle="For enquiries that came in by phone, walk-in or a referral." back={{ href: "/admin/leads", label: "All leads" }} />
      <Card><NewLeadForm packages={pkgs} /></Card>
    </div>
  );
}
