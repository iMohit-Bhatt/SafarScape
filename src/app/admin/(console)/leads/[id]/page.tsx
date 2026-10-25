import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { requirePageUser } from "@/lib/session";
import { getLead, assignableStaff, lostReasons } from "@/lib/leads";
import { emailsForEnquiry } from "@/lib/enquiries";
import { can } from "@/lib/permissions";
import { displayPhone, formatDate, formatINR, timeAgo } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";
import { Card } from "@/components/admin/ui";
import { ExternalIcon } from "@/components/ui/icons";
import { LeadHeaderControls, FollowUpBox, ActivityPanel, RetryEmail } from "./LeadControls";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: `Lead ${(await params).id}` };
}

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser("leads.view");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const db = await getDb();
  const lead = await getLead(db, user, id);
  if (!lead) notFound();
  const [staff, emails] = await Promise.all([assignableStaff(db), emailsForEnquiry(db, id)]);
  const e = lead.lead;
  const first = e.name.replace("Demo lead · ", "").split(" ")[0];
  const wa = whatsappLink(e.phone, `Hi ${first}, this is ${user.name.split(" ")[0]} from Safarscape about your enquiry ${e.reference}${lead.pkgTitle ? ` (${lead.pkgTitle})` : ""}.`);
  const details = Object.entries(e.details ?? {}).filter(([, v]) => v !== undefined && v !== "" && !(Array.isArray(v) && !v.length));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/admin/leads" className="text-[14px] text-stone hover:text-teal">‹ All leads</Link>
        <p className="text-[14px] text-stone">Lead {e.reference} · {e.kind === "package" ? "Website enquiry" : e.kind === "custom" ? "Custom trip request" : e.kind === "destination" ? "Destination enquiry" : e.source === "phone" ? "Added manually" : "Contact form"}</p>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-display text-[30px] text-teal">{e.name}</h1>
          <span className="text-[14px] text-stone">Created {timeAgo(e.createdAt)}</span>
        </div>
      </div>

      {e.emailStatus === "failed" && <RetryEmail id={e.id} />}

      <LeadHeaderControls
        id={e.id}
        status={e.status}
        assigneeId={e.assigneeId}
        staff={staff}
        lostReasons={lostReasons}
        canAssign={can(user.role, "leads.assign")}
        meId={user.id}
        phone={e.phone}
        phoneLabel={displayPhone(e.phone)}
        email={e.email}
        wa={wa}
        quotedAmount={e.quotedAmount}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <Card title="Trip context">
            <div className="flex flex-col gap-5">
              {lead.pkgTitle ? (
                <Link href={`/packages/${lead.pkgSlug}`} target="_blank" className="inline-flex items-center gap-1 text-[16px] font-medium text-teal underline">
                  {lead.pkgTitle} <ExternalIcon />
                </Link>
              ) : (
                <p className="text-[16px] font-medium text-charcoal">{e.kind === "custom" ? "Custom trip" : lead.destName ? `${lead.destName} — no package chosen` : "General enquiry"}</p>
              )}
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {[
                  ["Travel", e.travelMonth ?? "—"],
                  ["Travellers", `${e.adults} adult${e.adults > 1 ? "s" : ""}${e.children ? ` · ${e.children} child${e.children > 1 ? "ren" : ""}` : ""}`],
                  ["Budget", e.budget ?? "—"],
                  ["Departure city", e.departureCity ?? "—"],
                  ...(e.status === "quoted" || e.quotedAmount ? [["Quoted", formatINR(e.quotedAmount)]] : []),
                  ...(e.status === "lost" ? [["Lost reason", e.lostReason ?? "—"]] : []),
                  ...details.map(([k, v]) => [k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), Array.isArray(v) ? v.join(", ") : String(v)]),
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[12px] tracking-[0.1em] text-stone uppercase">{k}</dt>
                    <dd className="text-[15px] text-charcoal">{v}</dd>
                  </div>
                ))}
              </dl>
              {e.message && <blockquote className="border-l-2 border-gold pl-4 text-[15px] italic leading-6 text-charcoal">&ldquo;{e.message}&rdquo;</blockquote>}
              <p className="text-[13px] text-success">{e.consent ? "✓ Consented to phone, WhatsApp & email contact" : "No contact consent recorded"}</p>
            </div>
          </Card>
          <ActivityPanel
            id={e.id}
            activity={lead.activity.map(({ a, actorName }) => ({ id: a.id, kind: a.kind, body: a.body, actor: actorName, at: a.createdAt.toISOString() }))}
            emails={emails.map((m) => ({ id: m.id, to: m.to, subject: m.subject, body: m.body, status: m.status, kind: m.kind, error: m.error, at: m.createdAt.toISOString() }))}
          />
        </div>
        <div className="flex flex-col gap-6">
          <FollowUpBox id={e.id} followUpAt={e.followUpAt?.toISOString() ?? null} closed={e.status === "converted" || e.status === "lost"} />
          <Card title="Source">
            <dl className="grid grid-cols-[100px_1fr] gap-y-2 text-[14px]">
              <dt className="text-stone">Channel</dt><dd className="capitalize">{e.source}</dd>
              {Object.entries(e.utm).map(([k, v]) => (<><dt key={`k${k}`} className="text-stone">{k}</dt><dd key={`v${k}`} className="break-all font-mono text-[13px]">{v}</dd></>))}
              {e.referrer && (<><dt className="text-stone">Referrer</dt><dd className="break-all">{e.referrer}</dd></>)}
              {e.pageUrl && (<><dt className="text-stone">Page</dt><dd className="break-all">{e.pageUrl}</dd></>)}
              <dt className="text-stone">Submitted</dt><dd>{formatDate(e.createdAt, true)}</dd>
              <dt className="text-stone">First reply</dt><dd>{e.firstContactAt ? formatDate(e.firstContactAt, true) : "Not yet"}</dd>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
