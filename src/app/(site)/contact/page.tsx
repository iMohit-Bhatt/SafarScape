import type { Metadata } from "next";
import { getDb } from "@/db";
import { getSettings } from "@/lib/settings";
import { whatsappLink } from "@/lib/whatsapp";
import { displayPhone } from "@/lib/format";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Send a note and an advisor will call you back, usually the same working day. Or message us on WhatsApp.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const { agency } = await getSettings(await getDb());
  const wa = whatsappLink(agency.whatsapp, "Hi Safarscape, I have a question.");
  const rows: [string, React.ReactNode][] = [
    ["Phone", agency.phone ? <a href={`tel:${agency.phone.replace(/\s/g, "")}`}>{displayPhone(agency.phone)}</a> : <span className="text-stone">Coming soon</span>],
    ["WhatsApp", wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="border-b border-whatsapp text-whatsapp">Open chat →</a> : <span className="text-stone">Coming soon</span>],
    ["Email", agency.email ? <a href={`mailto:${agency.email}`}>{agency.email}</a> : <span className="text-stone">Use the form</span>],
    ["Office", agency.address || <span className="text-stone">By appointment</span>],
    ["Hours", agency.hours],
  ];
  return (
    <div className="page-x container-x flex flex-col gap-12 py-12 md:py-24 lg:flex-row lg:gap-24">
      <div className="flex flex-col gap-6 lg:w-[520px] lg:shrink-0">
        <p className="eyebrow">Contact</p>
        <h1 className="font-display text-[56px] leading-[58px] tracking-[-0.025em] text-teal md:text-[88px] md:leading-[88px]">Talk to a person</h1>
        <p className="text-[17px] leading-[28px] text-charcoal">Send a note and an advisor will call you back, usually the same working day. Or skip the form and message us on WhatsApp.</p>
        <dl className="mt-4 border-t border-line">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[120px_1fr] gap-4 border-b border-line py-4 text-[16px] md:grid-cols-[144px_1fr]">
              <dt className="pt-1 text-[11px] tracking-[0.12em] text-stone uppercase">{k}</dt>
              <dd className="text-charcoal">{v}</dd>
            </div>
          ))}
        </dl>
        {agency.mapUrl && (
          <a href={agency.mapUrl} target="_blank" rel="noopener noreferrer" className="text-[15px] font-medium text-teal underline">Open in Maps →</a>
        )}
      </div>
      <div className="flex-1">
        <ContactForm />
      </div>
    </div>
  );
}
