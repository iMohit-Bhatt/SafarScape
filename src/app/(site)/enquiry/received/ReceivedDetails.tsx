"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { lastEnquiry, type EnquirySummary } from "@/components/site/enquiry-client";
import { whatsappLink } from "@/lib/whatsapp";
import { btn } from "@/components/ui/buttons";
import { CheckIcon, WhatsAppIcon } from "@/components/ui/icons";

export function ReceivedDetails({ whatsappNumber, hasWhatsApp }: { whatsappNumber: string; hasWhatsApp: boolean }) {
  const [e, setE] = useState<EnquirySummary | null | undefined>(undefined);
  // Browser-only value: read after hydration so server and client markup match.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setE(lastEnquiry()), []);
  const wa = hasWhatsApp
    ? whatsappLink(whatsappNumber, e ? `Hi Safarscape, I just sent enquiry ${e.reference}${e.trip ? ` about ${e.trip}` : ""}.` : "Hi Safarscape, I just sent an enquiry.")
    : null;
  const steps = [
    ["An advisor reads your note", "We aim to pick it up within a few working hours — usually the same day."],
    [`We call you${e?.phone ? ` on ${e.phone}` : ""}`, "We try to call within one working day to talk through dates, hotels and anything you'd like changed."],
    ["You get a written quote", "A day-by-day plan and final price by email or WhatsApp. Nothing is booked until you say yes."],
  ];
  const rows: [string, string | undefined][] = e
    ? [
        ["Trip", e.tripMeta],
        ["Departure", e.departure],
        ["Travellers", e.travellers],
        ["From", e.from],
        ["Budget", e.budget ? `${e.budget} per person` : undefined],
      ]
    : [];

  return (
    <>
      <section className="border-b border-line">
        <div className="page-x container-x flex flex-col justify-between gap-10 py-14 md:py-24 lg:flex-row lg:items-end">
          <div className="flex max-w-[720px] flex-col gap-6">
            <p className="flex items-center gap-2.5 text-[12px] tracking-[0.14em] text-success uppercase">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-bg"><CheckIcon className="h-3.5 w-3.5" /></span>
              Enquiry received
            </p>
            <h1 className="font-display text-[44px] leading-[48px] tracking-[-0.02em] text-teal md:text-[72px] md:leading-[76px]" data-testid="received-heading">
              We&apos;ve got your enquiry{e?.firstName ? `, ${e.firstName}` : ""}.
            </h1>
            <p className="max-w-[560px] text-[17px] leading-[28px] text-charcoal md:text-[18px] md:leading-[29px]">
              Thank you.{e?.email ? ` A copy is on its way to ${e.email}, and` : ""} someone who knows {e?.destinationName || "this trip"} will be in touch soon.
            </p>
          </div>
          {e && (
            <div className="flex flex-col gap-2 border-l border-line pl-8 lg:w-[400px]">
              <p className="eyebrow">Your reference</p>
              <p className="font-display text-[40px] leading-[48px] text-teal" data-testid="reference">{e.reference}</p>
              <p className="text-[14px] text-stone">Mention it on a call or WhatsApp so we can find your trip quickly.</p>
            </div>
          )}
        </div>
      </section>
      <section className="page-x container-x flex flex-col gap-12 py-14 md:py-16 lg:flex-row lg:gap-24">
        <div className="flex flex-1 flex-col gap-8">
          <h2 className="font-display text-[34px] leading-[40px] text-teal md:text-[40px]">What happens next</h2>
          <ol className="border-t border-line">
            {steps.map(([t, b], i) => (
              <li key={t} className="flex gap-8 border-b border-line py-6 md:gap-12">
                <span className="font-display text-[30px] leading-[34px] text-teal">0{i + 1}</span>
                <div className="flex flex-col gap-1.5">
                  <p className="text-[18px] text-charcoal">{t}</p>
                  <p className="text-[15px] leading-6 text-stone">{b}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-3">
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className={btn.whatsappSolid}>
                <WhatsAppIcon /> Message us on WhatsApp
              </a>
            )}
            <Link href="/packages" className={btn.secondary}>Keep browsing</Link>
          </div>
        </div>
        {e && (
          <aside className="flex flex-col gap-4 self-start rounded-[4px] border border-line bg-white p-7 lg:w-[420px]">
            <p className="eyebrow">What you sent</p>
            <p className="font-display text-[24px] leading-[30px] text-teal">{e.trip}</p>
            <dl className="flex flex-col">
              {rows
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-t border-line py-3 text-[14px]">
                    <dt className="text-stone">{k}</dt>
                    <dd className="text-right text-charcoal">{v}</dd>
                  </div>
                ))}
              {e.note && (
                <div className="border-t border-line py-3 text-[14px]">
                  <dt className="text-stone">Your note</dt>
                  <dd className="pt-2 text-charcoal">{e.note}</dd>
                </div>
              )}
            </dl>
            {wa && <a href={wa} className="text-[14px] text-teal underline" target="_blank" rel="noopener noreferrer">Something wrong? Tell us on WhatsApp</a>}
          </aside>
        )}
      </section>
    </>
  );
}
