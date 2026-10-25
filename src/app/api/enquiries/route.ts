import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { submitEnquiry } from "@/lib/enquiries";

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  try {
    const db = await getDb();
    const result = await submitEnquiry(db, body, {
      ip: clientIp(req),
      userAgent: req.headers.get("user-agent"),
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error, fieldErrors: result.fieldErrors }, { status: result.status });
    }
    return NextResponse.json({ ok: true, reference: result.reference, firstName: result.firstName }, { status: 201 });
  } catch (e) {
    // Never leak internals to visitors.
    console.error("[api/enquiries] unexpected error", e);
    return NextResponse.json(
      { ok: false, error: "Something went wrong on our side and your enquiry wasn't sent. Please try again or message us on WhatsApp." },
      { status: 500 },
    );
  }
}
