import Link from "next/link";
import type { Settings } from "@/lib/settings";
import { whatsappLink } from "@/lib/whatsapp";
import { displayPhone } from "@/lib/format";

export function SiteFooter({ agency }: { agency: Settings["agency"] }) {
  const wa = whatsappLink(agency.whatsapp, "Hi Safarscape, I'd like help planning a trip.");
  const talk = [
    agency.phone && { label: `Call ${displayPhone(agency.phone)}`, href: `tel:${agency.phone.replace(/\s/g, "")}` },
    wa && { label: "WhatsApp us", href: wa },
    agency.email && { label: agency.email, href: `mailto:${agency.email}` },
    agency.address && { label: agency.address, href: agency.mapUrl || undefined },
  ].filter(Boolean) as { label: string; href?: string }[];
  const cols = [
    { title: "Travel", links: [["Packages", "/packages"], ["Destinations", "/destinations"], ["Custom trip", "/custom-trip"], ["Travel guides", "/guides"]] },
    { title: "Agency", links: [["About", "/about"], ["Reviews", "/reviews"], ["Gallery", "/gallery"], ["Contact", "/contact"]] },
  ];
  return (
    <footer className="mt-auto border-t border-line">
      <div className="page-x container-x flex flex-col gap-12 pb-10 pt-16 md:gap-16 md:pt-20">
        <div className="flex flex-col justify-between gap-10 lg:flex-row">
          <div className="flex max-w-[360px] flex-col gap-4">
            <Link href="/" className="font-display text-[40px] leading-[48px] text-teal">Safarscape</Link>
            <p className="text-[15px] leading-6 text-stone">Holidays planned by phone and WhatsApp, with a real person on the other end.</p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 sm:gap-24">
            {cols.map((c) => (
              <div key={c.title} className="flex flex-col gap-3">
                <p className="eyebrow">{c.title}</p>
                {c.links.map(([label, href]) => (
                  <Link key={href} href={href} className="text-[15px] text-charcoal hover:text-teal">{label}</Link>
                ))}
              </div>
            ))}
            <div className="flex flex-col gap-3">
              <p className="eyebrow">Talk to us</p>
              {talk.length ? (
                talk.map((t) =>
                  t.href ? (
                    <a key={t.label} href={t.href} className="text-[15px] text-charcoal hover:text-teal" {...(t.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                      {t.label}
                    </a>
                  ) : (
                    <span key={t.label} className="text-[15px] text-charcoal">{t.label}</span>
                  ),
                )
              ) : (
                <Link href="/contact" className="text-[15px] text-charcoal hover:text-teal">Send us a message</Link>
              )}
              {agency.hours && <span className="text-[13px] text-stone">{agency.hours}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-6 text-[13px] text-stone">
          <span>© {new Date().getFullYear()} Safarscape</span>
          <span className="flex gap-2">
            <Link href="/privacy" className="hover:text-teal">Privacy</Link>·<Link href="/terms" className="hover:text-teal">Terms</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
