"use client";
import { useState } from "react";
import { abtn } from "@/components/admin/ui";
import { Input, Toggle, Panel } from "@/components/admin/form";
import { saveGalleryAction, deleteGalleryAction } from "../actions";
import { useSave } from "../useSave";

type G = { id: number; caption: string; alt: string; color: string; url: string | null; destinationSlug: string | null; credit: string | null; peopleConsent: boolean; visible: boolean };
const blank = { caption: "", alt: "", color: "#DCD6C2", url: "", destinationSlug: "", credit: "", peopleConsent: true, visible: true };

export function GalleryManager({ items }: { items: G[] }) {
  const { run, pending, errors } = useSave();
  const [edit, setEdit] = useState<number | "new" | null>(null);
  const [f, setF] = useState(blank);
  const open = (g?: G) => { setEdit(g ? g.id : "new"); setF(g ? { caption: g.caption, alt: g.alt, color: g.color, url: g.url ?? "", destinationSlug: g.destinationSlug ?? "", credit: g.credit ?? "", peopleConsent: g.peopleConsent, visible: g.visible } : blank); };
  return (
    <div className="flex flex-col gap-5">
      <div><button type="button" className={abtn.primary} onClick={() => open()}>+ Add image</button></div>
      {edit !== null && (
        <Panel title={edit === "new" ? "Add image" : "Edit image"}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Caption" value={f.caption} onChange={(v) => setF({ ...f, caption: v })} error={errors.caption} />
            <Input label="Alt text" value={f.alt} onChange={(v) => setF({ ...f, alt: v })} error={errors.alt} />
            <Input label="Image URL" value={f.url} onChange={(v) => setF({ ...f, url: v })} error={errors.url} placeholder="https://…" />
            <Input label="Placeholder colour" value={f.color} onChange={(v) => setF({ ...f, color: v })} error={errors.color} />
            <Input label="Destination slug" value={f.destinationSlug} onChange={(v) => setF({ ...f, destinationSlug: v })} placeholder="kashmir" />
            <Input label="Credit" value={f.credit} onChange={(v) => setF({ ...f, credit: v })} />
          </div>
          <Toggle label="People in the photo have agreed to be shown (or there are none)" checked={f.peopleConsent} onChange={(v) => setF({ ...f, peopleConsent: v })} />
          <Toggle label="Visible on the site" checked={f.visible} onChange={(v) => setF({ ...f, visible: v })} />
          <div className="flex gap-2">
            <button type="button" disabled={pending} className={abtn.primary} onClick={() => run(() => saveGalleryAction(edit === "new" ? null : edit, f), () => setEdit(null))}>Save</button>
            <button type="button" className={abtn.secondary} onClick={() => setEdit(null)}>Cancel</button>
          </div>
        </Panel>
      )}
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {items.map((g) => (
          <li key={g.id} className="flex flex-col overflow-hidden rounded-[8px] border border-line bg-white">
            <div className="h-[140px] bg-cover bg-center" style={{ backgroundColor: g.color, backgroundImage: g.url ? `url(${g.url})` : undefined }} role="img" aria-label={g.alt} />
            <div className="flex flex-1 flex-col gap-1 p-3 text-[13px]">
              <span className="font-medium">{g.caption}</span>
              <span className="text-stone">{g.destinationSlug ?? "—"} · {g.visible ? "Visible" : "Hidden"}{!g.peopleConsent && " · No consent"}</span>
              <span className="mt-auto flex gap-2 pt-2">
                <button type="button" className={abtn.small} onClick={() => open(g)}>Edit</button>
                <button type="button" disabled={pending} className={abtn.small} onClick={() => confirm("Remove this image?") && run(() => deleteGalleryAction(g.id))}>Remove</button>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
