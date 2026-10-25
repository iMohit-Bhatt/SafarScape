import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="October 2026"
      sections={[
        ["What we collect", ["When you send an enquiry we collect your name, phone number, and anything else you choose to share — email, travel dates, who's travelling, budget and notes.", "We also record how you found us (for example, a Google search or an Instagram ad) so we know which channels are useful."]],
        ["How we use it", ["Only to plan the trip you asked about: to call or WhatsApp you, email a quote, and follow up. We don't sell your details or add you to marketing lists without asking."]],
        ["Who sees it", ["Our advisors, and the email provider we use to send your confirmation. When you book, hotels and transport partners receive the details they need for your reservation."]],
        ["Cookies and analytics", ["Essential cookies keep the site and staff console working. With your consent we use Google Analytics and the Meta Pixel to understand which pages and trips people find useful. You can change your choice by clearing cookies for this site."]],
        ["How long we keep it", ["Enquiries are kept for up to 24 months so we can help with repeat trips, then deleted or anonymised. Ask us and we'll delete them sooner."]],
        ["Your choices", ["You can ask to see, correct or delete your details at any time through the contact page."]],
      ]}
    />
  );
}
