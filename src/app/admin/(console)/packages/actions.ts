"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import type { PublishStatus } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { run, strip, type ActionResult } from "@/lib/action-result";
import { savePackage, setPackageStatus, duplicatePackage, saveDeparture, deleteDeparture } from "@/lib/admin-catalogue";

const refresh = (slug?: string) => {
  revalidatePath("/admin/packages");
  revalidatePath("/packages");
  revalidatePath("/");
  if (slug) revalidatePath(`/packages/${slug}`);
};

export async function savePackageAction(id: number | null, input: unknown): Promise<ActionResult<{ id: number; slug: string }>> {
  const r = await run(async () => {
    const p = await savePackage(await getDb(), await requireUser("catalogue.edit"), id, input);
    return { id: p.id, slug: p.slug };
  }, id ? "Saved" : "Draft created");
  if (r.ok) refresh(r.data?.slug);
  return r;
}

export async function packageStatusAction(id: number, status: PublishStatus): Promise<ActionResult> {
  const r = await run(async () => setPackageStatus(await getDb(), await requireUser("catalogue.publish"), id, status), status === "published" ? "Published — it's live on the site" : `Moved to ${status}`);
  if (r.ok) refresh(r.data?.slug);
  return strip(r);
}

export async function duplicatePackageAction(id: number): Promise<ActionResult<{ id: number }>> {
  const r = await run(async () => ({ id: (await duplicatePackage(await getDb(), await requireUser("catalogue.edit"), id)).id }), "Copy created as a draft");
  if (r.ok) refresh();
  return r;
}

export async function saveDepartureAction(packageId: number, depId: number | null, input: unknown): Promise<ActionResult> {
  const r = await run(async () => saveDeparture(await getDb(), await requireUser("catalogue.edit"), packageId, depId, input), "Departure saved");
  if (r.ok) refresh();
  return strip(r);
}

export async function deleteDepartureAction(packageId: number, depId: number): Promise<ActionResult> {
  const r = await run(async () => deleteDeparture(await getDb(), await requireUser("catalogue.edit"), packageId, depId), "Departure removed");
  if (r.ok) refresh();
  return strip(r);
}
