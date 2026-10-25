import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Terms of use", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      updated="October 2026"
      sections={[
        ["About this website", ["This website lets you browse trips and send enquiries. Nothing is booked or paid for online. A trip is only confirmed after you speak with an advisor and accept a written quote."]],
        ["Prices", ["Prices shown are starting prices per person, usually on twin sharing and excluding flights, unless stated. Final prices depend on dates, hotel availability and group size and are confirmed in your quote."]],
        ["Offers", ["Offers are valid for the dates and packages stated and may be withdrawn once allocations run out. Terms shown with each offer apply."]],
        ["Cancellations", ["Each package lists its cancellation policy. The full policy is included in your quote and booking confirmation."]],
        ["Travel information", ["Permits, visa rules and seasonal advice change. We check the information on this site regularly, but always confirm with your advisor before you travel."]],
        ["Contact", ["Questions about these terms? Get in touch through the contact page."]],
      ]}
    />
  );
}
