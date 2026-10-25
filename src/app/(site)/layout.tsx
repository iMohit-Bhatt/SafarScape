import { getDb } from "@/db";
import { getSettings } from "@/lib/settings";
import { whatsappLink } from "@/lib/whatsapp";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Analytics } from "@/components/site/Analytics";
import { JsonLd } from "@/components/site/JsonLd";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings(await getDb());
  const wa = whatsappLink(settings.agency.whatsapp, "Hi Safarscape, I'd like help planning a trip.");
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TravelAgency",
          name: "Safarscape",
          url: site,
          ...(settings.agency.phone ? { telephone: settings.agency.phone } : {}),
          ...(settings.agency.email ? { email: settings.agency.email } : {}),
          ...(settings.agency.address ? { address: settings.agency.address } : {}),
        }}
      />
      <SiteHeader whatsappHref={wa} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter agency={settings.agency} />
      <Analytics gaId={process.env.NEXT_PUBLIC_GA4_ID} pixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID} />
    </div>
  );
}
