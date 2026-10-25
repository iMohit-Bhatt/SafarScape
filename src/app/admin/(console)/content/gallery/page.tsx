import { getDb } from "@/db";
import { requirePageUser } from "@/lib/session";
import { listGallery } from "@/lib/admin-content";
import { PageHeader } from "@/components/admin/ui";
import { GalleryManager } from "./GalleryManager";

export const metadata = { title: "Gallery" };

export default async function GalleryAdmin() {
  await requirePageUser("content.edit");
  const items = await listGallery(await getDb());
  return (
    <div>
      <PageHeader title="Gallery" subtitle="Photos on the public Gallery page. Images showing people need their consent." />
      <GalleryManager items={items} />
    </div>
  );
}
