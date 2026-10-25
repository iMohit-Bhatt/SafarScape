import type { Metadata } from "next";
import { getDb } from "@/db";
import { visibleGallery } from "@/lib/catalogue";
import { GalleryGrid } from "./GalleryGrid";

export const metadata: Metadata = { title: "Gallery", description: "Places our travellers have been — houseboats, high passes, quiet beaches.", alternates: { canonical: "/gallery" } };

export default async function GalleryPage() {
  const images = await visibleGallery(await getDb());
  return (
    <div className="page-x container-x pb-24 pt-10 md:pt-16">
      <div className="flex flex-col justify-between gap-6 border-b border-line pb-8 md:flex-row md:items-end">
        <div className="flex flex-col gap-3">
          <p className="eyebrow">Gallery</p>
          <h1 className="font-display text-[48px] leading-[52px] tracking-[-0.025em] text-teal md:text-[72px] md:leading-[76px]">From the road</h1>
        </div>
        <p className="max-w-[380px] text-[15px] leading-6 text-stone">Photos are placeholders until the agency&apos;s own images are uploaded. People are only shown with their consent.</p>
      </div>
      <GalleryGrid images={images.map((g) => ({ color: g.color, alt: g.alt, caption: g.caption, url: g.url ?? undefined, dest: g.destinationSlug ?? "" }))} />
    </div>
  );
}
