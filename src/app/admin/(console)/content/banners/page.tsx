import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { packages } from "@/db/schema";
import { requirePageUser } from "@/lib/session";
import { listBanners, listOffers } from "@/lib/admin-content";
import { PageHeader } from "@/components/admin/ui";
import { BannersOffers } from "./BannersOffers";

export const metadata = { title: "Banners & offers" };

export default async function BannersAdmin() {
  await requirePageUser("content.edit");
  const db = await getDb();
  const [banners, offers, pkgs] = await Promise.all([listBanners(db), listOffers(db), db.select({ id: packages.id, title: packages.title }).from(packages).orderBy(asc(packages.title))]);
  return (
    <div>
      <PageHeader title="Banners & offers" subtitle="The homepage strip and discounts shown on package cards. Only one banner shows at a time — the highest priority that's live." />
      <BannersOffers banners={banners} offers={offers.map((o) => ({ ...o, createdAt: undefined }))} packages={pkgs} />
    </div>
  );
}
