"use client";
import Script from "next/script";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { captureAttribution } from "./analytics-client";

const CONSENT = "sfs_consent";
function readConsent(): "all" | "essential" | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )sfs_consent=([^;]+)/);
  return m ? (m[1] as "all" | "essential") : null;
}

export function Analytics({ gaId, pixelId }: { gaId?: string; pixelId?: string }) {
  const [consent, setConsent] = useState<"all" | "essential" | null | undefined>(undefined);
  const pathname = usePathname();
  const needsConsent = Boolean(gaId || pixelId);

  useEffect(() => {
    // Cookie is browser-only; read after hydration so server and client markup match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(readConsent());
    captureAttribution();
  }, []);

  useEffect(() => {
    if (consent !== "all") return;
    window.gtag?.("event", "page_view", { page_path: pathname });
    window.fbq?.("track", "PageView");
  }, [pathname, consent]);

  const choose = (v: "all" | "essential") => {
    document.cookie = `${CONSENT}=${v}; path=/; max-age=${180 * 86400}; SameSite=Lax`;
    setConsent(v);
  };

  return (
    <>
      {consent === "all" && gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${gaId}',{send_page_view:false});`}
          </Script>
        </>
      )}
      {consent === "all" && pixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');`}
        </Script>
      )}
      {needsConsent && consent === null && (
        <div role="region" aria-label="Cookie preferences" className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-[720px] rounded-[8px] border border-line bg-white p-5 shadow-[0_12px_40px_rgba(31,35,40,0.12)] md:inset-x-6 md:bottom-6">
          <p className="font-display text-[20px] text-teal">A note on cookies</p>
          <p className="mt-1.5 text-[14px] leading-[22px] text-stone">
            We use essential cookies to run the site. With your OK we&apos;ll also use Google Analytics and the Meta Pixel to see which trips people find useful. <Link href="/privacy" className="underline">Privacy policy</Link>
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => choose("all")} className="rounded-[4px] bg-teal px-5 py-2.5 text-[14px] font-medium text-ivory">Accept analytics</button>
            <button type="button" onClick={() => choose("essential")} className="rounded-[4px] border border-line px-5 py-2.5 text-[14px] font-medium text-charcoal">Only essential</button>
          </div>
        </div>
      )}
    </>
  );
}
