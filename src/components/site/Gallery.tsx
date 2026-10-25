"use client";
import { useEffect, useState } from "react";
import { Photo } from "@/components/ui/Photo";
import type { Photo as PhotoT } from "@/db/schema";
import { CloseIcon } from "@/components/ui/icons";

export function PhotoViewer({ photos, index, onClose }: { photos: PhotoT[]; index: number; onClose: () => void }) {
  const [i, setI] = useState(index);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((v) => (v + 1) % photos.length);
      if (e.key === "ArrowLeft") setI((v) => (v - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [photos.length, onClose]);
  const p = photos[i];
  return (
    <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-50 flex flex-col bg-[#101416] text-ivory">
      <div className="flex items-center justify-between px-5 py-4 md:px-10">
        <span className="text-[14px] text-ivory/70">
          {i + 1} / {photos.length}
        </span>
        <button type="button" onClick={onClose} aria-label="Close viewer" className="flex items-center gap-2 text-[15px]">
          Close <CloseIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center gap-4 px-2 md:px-10">
        <button type="button" aria-label="Previous photo" onClick={() => setI((i - 1 + photos.length) % photos.length)} className="hidden h-12 w-12 shrink-0 rounded-full border border-ivory/30 md:block">←</button>
        <Photo photo={p} className="aspect-[4/3] w-full max-w-[1100px]" />
        <button type="button" aria-label="Next photo" onClick={() => setI((i + 1) % photos.length)} className="hidden h-12 w-12 shrink-0 rounded-full border border-ivory/30 md:block">→</button>
      </div>
      <div className="flex items-center justify-between gap-4 px-5 py-5 md:px-10">
        <p className="text-[15px]">{p.caption ?? p.alt}</p>
        <div className="flex gap-2 md:hidden">
          <button type="button" aria-label="Previous photo" onClick={() => setI((i - 1 + photos.length) % photos.length)} className="h-10 w-10 rounded-full border border-ivory/30">←</button>
          <button type="button" aria-label="Next photo" onClick={() => setI((i + 1) % photos.length)} className="h-10 w-10 rounded-full border border-ivory/30">→</button>
        </div>
      </div>
    </div>
  );
}

export function PackageGallery({ photos }: { photos: PhotoT[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const list = photos.length ? photos : [{ color: "#DCD6C2", alt: "Photo placeholder" }];
  const side = list.slice(1, 3);
  return (
    <>
      <div className="grid gap-2.5 md:grid-cols-[2fr_1fr] md:gap-4">
        <button type="button" onClick={() => setOpen(0)} className="relative block text-left" aria-label={`Open photo: ${list[0].alt}`}>
          <Photo photo={list[0]} className="h-[260px] md:h-[500px]" priority>
            {list[0].caption && <span className="absolute bottom-3 left-3 text-[12px] text-charcoal/80">{list[0].caption}</span>}
          </Photo>
        </button>
        <div className="hidden grid-rows-2 gap-4 md:grid">
          {[0, 1].map((k) => {
            const p = side[k] ?? list[0];
            const last = k === 1;
            return (
              <button key={k} type="button" onClick={() => setOpen(last ? 0 : Math.min(k + 1, list.length - 1))} className="relative block" aria-label={last ? `View all ${list.length} photos` : `Open photo: ${p.alt}`}>
                <Photo photo={p} className="h-full min-h-[240px]">
                  {last && <span className="absolute inset-0 flex items-center justify-center bg-charcoal/30 text-[15px] text-ivory">View all {list.length} photos</span>}
                </Photo>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => setOpen(0)} className="text-left text-[14px] text-teal underline md:hidden">View all {list.length} photos</button>
      </div>
      {open !== null && <PhotoViewer photos={list} index={open} onClose={() => setOpen(null)} />}
    </>
  );
}
