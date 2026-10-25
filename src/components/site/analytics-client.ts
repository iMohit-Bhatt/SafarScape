"use client";

type Params = Record<string, string | number | boolean | undefined>;
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    __sfsEvents?: { name: string; params: Params }[];
  }
}

/** Sends an event to GA4 and Meta Pixel when they're loaded (after consent). Always records locally for debugging/tests. */
export function track(name: string, params: Params = {}) {
  if (typeof window === "undefined") return;
  (window.__sfsEvents ??= []).push({ name, params });
  window.gtag?.("event", name, params);
  if (window.fbq) {
    if (name === "generate_lead") window.fbq("track", "Lead", { content_name: params.package_name, value: params.value, currency: "INR" });
    else if (name === "whatsapp_click") window.fbq("track", "Contact");
    else window.fbq("trackCustom", name, params);
  }
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];
const STORE = "sfs_attribution";

/** First-touch attribution kept for 30 days and attached to every enquiry. */
export function captureAttribution() {
  try {
    const url = new URL(window.location.href);
    const utm: Record<string, string> = {};
    for (const k of UTM_KEYS) {
      const v = url.searchParams.get(k);
      if (v) utm[k] = v.slice(0, 200);
    }
    const existing = readAttribution();
    const referrer = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : undefined;
    if (Object.keys(utm).length || (!existing && referrer)) {
      localStorage.setItem(STORE, JSON.stringify({ utm, referrer, landing: url.pathname, at: Date.now() }));
    } else if (!existing) {
      localStorage.setItem(STORE, JSON.stringify({ utm: {}, referrer: undefined, landing: url.pathname, at: Date.now() }));
    }
  } catch {
    /* storage blocked — attribution is best-effort */
  }
}

export function readAttribution(): { utm: Record<string, string>; referrer?: string; landing?: string } | null {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (Date.now() - v.at > 30 * 86400_000) return null;
    return v;
  } catch {
    return null;
  }
}
