import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { currentUser } from "@/lib/session";
import { exportLeadsCsv } from "@/lib/leads";
import { can } from "@/lib/permissions";
import { parseLeadFilters } from "../filters";

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  if (!can(user.role, "leads.export")) return new Response("Your role can't export leads.", { status: 403 });
  const f = parseLeadFilters(Object.fromEntries(req.nextUrl.searchParams));
  const csv = await exportLeadsCsv(await getDb(), user, f);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="safarscape-leads-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
