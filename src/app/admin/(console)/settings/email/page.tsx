import { getDb } from "@/db";
import { requirePageUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { publishedDestinations } from "@/lib/catalogue";
import { getEmailProvider } from "@/lib/email";
import { turnstileEnabled } from "@/lib/turnstile";
import { PageHeader } from "@/components/admin/ui";
import { EmailSettings } from "./EmailSettings";

export const metadata = { title: "Email & routing" };

export default async function EmailPage() {
  const user = await requirePageUser("settings.email");
  const db = await getDb();
  const [s, dests] = await Promise.all([getSettings(db), publishedDestinations(db)]);
  const provider = getEmailProvider().name;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Email & routing" subtitle="Who gets new enquiry emails, and what travellers receive back." />
      <div className={`rounded-[4px] px-4 py-3 text-[14px] ${provider === "resend" ? "bg-success-bg text-success" : "bg-warning-bg text-warning"}`}>
        {provider === "resend"
          ? "Sending through Resend. Use “Send test email” to confirm delivery to your inbox."
          : "No email provider is configured (RESEND_API_KEY is not set). Emails are recorded in the outbox below each lead but not delivered. Leads are still saved."}
        {" "}Spam protection: {turnstileEnabled() ? "Cloudflare Turnstile is on." : "Turnstile keys not set — honeypot and rate limits only."}
      </div>
      <EmailSettings userEmail={user.email} recipients={s.emailRecipients} rules={s.routingRules} autoReply={s.autoReply} destinations={dests.map((d) => ({ slug: d.slug, name: d.name }))} />
    </div>
  );
}
