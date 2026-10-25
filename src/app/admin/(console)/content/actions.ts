"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { requireUser } from "@/lib/session";
import { run, strip, type ActionResult } from "@/lib/action-result";
import {
  savePost, saveTestimonial, moderateTestimonial, saveGalleryImage, deleteGalleryImage, saveBanner, deleteBanner, saveOffer,
} from "@/lib/admin-content";

const refreshSite = () => revalidatePath("/", "layout");

export async function savePostAction(id: number | null, input: unknown): Promise<ActionResult<{ id: number }>> {
  const r = await run(async () => ({ id: (await savePost(await getDb(), await requireUser("content.edit"), id, input)).id }), "Article saved");
  if (r.ok) refreshSite();
  return r;
}
export async function saveTestimonialAction(id: number | null, input: unknown): Promise<ActionResult> {
  const r = await run(async () => saveTestimonial(await getDb(), await requireUser("content.edit"), id, input), "Review saved — pending approval");
  if (r.ok) refreshSite();
  return strip(r);
}
export async function moderateAction(id: number, action: "approve" | "reject" | "home-on" | "home-off"): Promise<ActionResult> {
  const r = await run(async () => moderateTestimonial(await getDb(), await requireUser("testimonials.approve"), id, action), { approve: "Approved", reject: "Rejected", "home-on": "Shown on homepage", "home-off": "Hidden from homepage" }[action]);
  if (r.ok) refreshSite();
  return strip(r);
}
export async function saveGalleryAction(id: number | null, input: unknown): Promise<ActionResult> {
  const r = await run(async () => saveGalleryImage(await getDb(), await requireUser("content.edit"), id, input), "Image saved");
  if (r.ok) refreshSite();
  return strip(r);
}
export async function deleteGalleryAction(id: number): Promise<ActionResult> {
  const r = await run(async () => deleteGalleryImage(await getDb(), await requireUser("content.edit"), id), "Image removed");
  if (r.ok) refreshSite();
  return strip(r);
}
export async function saveBannerAction(id: number | null, input: unknown): Promise<ActionResult> {
  const r = await run(async () => saveBanner(await getDb(), await requireUser("content.edit"), id, input), "Banner saved");
  if (r.ok) refreshSite();
  return strip(r);
}
export async function deleteBannerAction(id: number): Promise<ActionResult> {
  const r = await run(async () => deleteBanner(await getDb(), await requireUser("content.edit"), id), "Banner deleted");
  if (r.ok) refreshSite();
  return strip(r);
}
export async function saveOfferAction(id: number | null, input: unknown): Promise<ActionResult> {
  const r = await run(async () => saveOffer(await getDb(), await requireUser("content.edit"), id, input), "Offer saved");
  if (r.ok) refreshSite();
  return strip(r);
}
