import { getDb } from "@/db";
import { requirePageUser } from "@/lib/session";
import { listTestimonials } from "@/lib/admin-content";
import { PageHeader } from "@/components/admin/ui";
import { TestimonialsBoard } from "./TestimonialsBoard";

export const metadata = { title: "Testimonials" };

export default async function TestimonialsAdmin() {
  await requirePageUser("content.edit");
  const list = await listTestimonials(await getDb());
  return (
    <div>
      <PageHeader title="Testimonials" subtitle="Only approved reviews with recorded consent appear on the site. Never edit a traveller's words." />
      <TestimonialsBoard items={list.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() }))} />
    </div>
  );
}
