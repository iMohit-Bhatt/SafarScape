"use client";
import { useState } from "react";
import { Photo } from "@/components/ui/Photo";
import { PhotoViewer } from "@/components/site/Gallery";

type Img = { color: string; alt: string; caption: string; url?: string; dest: string };

export function GalleryGrid({ images }: { images: Img[] }) {
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const dests = [...new Set(images.map((i) => i.dest).filter(Boolean))];
  const list = filter ? images.filter((i) => i.dest === filter) : images;
  const heights = ["h-[260px]", "h-[340px]", "h-[220px]", "h-[300px]"];
  return (
    <>
      <div className="flex flex-wrap gap-2 py-6">
        <button type="button" aria-pressed={!filter} onClick={() => setFilter("")} className={`rounded-full border px-4 py-1.5 text-[14px] ${!filter ? "border-teal bg-teal text-ivory" : "border-line bg-white"}`}>All</button>
        {dests.map((d) => (
          <button key={d} type="button" aria-pressed={filter === d} onClick={() => setFilter(d)} className={`rounded-full border px-4 py-1.5 text-[14px] capitalize ${filter === d ? "border-teal bg-teal text-ivory" : "border-line bg-white"}`}>{d.replace(/-/g, " ")}</button>
        ))}
      </div>
      <ul className="columns-1 gap-5 sm:columns-2 lg:columns-3">
        {list.map((img, i) => (
          <li key={`${img.caption}-${i}`} className="mb-5 break-inside-avoid">
            <button type="button" className="block w-full text-left" onClick={() => setOpen(i)} aria-label={`Open ${img.caption}`}>
              <Photo photo={img} className={heights[i % heights.length]} />
              <span className="block pt-2 text-[13px] text-stone">{img.caption}</span>
            </button>
          </li>
        ))}
      </ul>
      {open !== null && <PhotoViewer photos={list} index={open} onClose={() => setOpen(null)} />}
    </>
  );
}
