"use client";
import { readAttribution, track } from "./analytics-client";

export type EnquirySummary = {
  reference: string;
  firstName: string;
  email?: string;
  phone: string;
  trip?: string;
  tripMeta?: string;
  departure?: string;
  travellers?: string;
  from?: string;
  budget?: string;
  note?: string;
  destinationName?: string;
};

export type SubmitOutcome =
  | { ok: true; reference: string; firstName: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; network?: boolean };

export async function postEnquiry(payload: Record<string, unknown>): Promise<SubmitOutcome> {
  const attribution = readAttribution();
  const body = {
    ...payload,
    utm: attribution?.utm ?? {},
    referrer: attribution?.referrer,
    pageUrl: typeof window !== "undefined" ? window.location.pathname + window.location.search : undefined,
  };
  try {
    const res = await fetch("/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) return { ok: true, reference: data.reference, firstName: data.firstName };
    return { ok: false, error: data.error ?? "Something went wrong. Please try again.", fieldErrors: data.fieldErrors };
  } catch {
    return { ok: false, network: true, error: "We couldn't reach our server. Check your connection and try again." };
  }
}

export function rememberEnquiry(summary: EnquirySummary, value?: number) {
  try {
    sessionStorage.setItem("sfs_last_enquiry", JSON.stringify(summary));
  } catch {
    /* ignore */
  }
  track("generate_lead", { reference: summary.reference, package_name: summary.trip, value, currency: "INR" });
}

export function lastEnquiry(): EnquirySummary | null {
  try {
    const raw = sessionStorage.getItem("sfs_last_enquiry");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
