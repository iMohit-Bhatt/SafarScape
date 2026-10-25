import { getDb } from "@/db";
import { requirePageUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/admin/ui";
import { AgencyForm } from "./AgencyForm";

export const metadata = { title: "Agency & WhatsApp" };

export default async function AgencyPage() {
  await requirePageUser("settings.agency");
  const s = await getSettings(await getDb());
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Agency & WhatsApp" subtitle="Contact details shown in the footer, contact page and structured data. Leave a field empty to hide it." />
      <AgencyForm agency={s.agency} template={s.whatsappTemplate} />
    </div>
  );
}
