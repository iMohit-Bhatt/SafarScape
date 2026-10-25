"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import type { PublishStatus } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { run, strip, type ActionResult } from "@/lib/action-result";
import { saveDestination, setDestinationStatus } from "@/lib/admin-catalogue";

export async function saveDestinationAction(id: number | null, input: unknown): Promise<ActionResult<{ id: number }>> {
  const r = await run(async () => ({ id: (await saveDestination(await getDb(), await requireUser("catalogue.edit"), id, input)).id }), id ? "Saved" : "Destination created as a draft");
  if (r.ok) { revalidatePath("/admin/destinations"); revalidatePath("/destinations", "layout"); }
  return r;
}

export async function destinationStatusAction(id: number, status: PublishStatus): Promise<ActionResult> {
  const r = await run(async () => setDestinationStatus(await getDb(), await requireUser("catalogue.publish"), id, status), status === "published" ? "Published" : "Unpublished");
  if (r.ok) { revalidatePath("/admin/destinations"); revalidatePath("/destinations", "layout"); }
  return strip(r);
}
