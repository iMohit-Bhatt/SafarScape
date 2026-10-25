"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { abtn } from "@/components/admin/ui";
import { Input, TextArea, Select, Toggle, Panel } from "@/components/admin/form";
import { savePostAction } from "../../actions";
import { useSave } from "../../useSave";

type Draft = { title: string; slug: string; category: string; excerpt: string; body: string; author: string; readMinutes: number; heroColor: string; heroAlt: string; status: string; publishAt: string; featured: boolean; seoTitle: string; seoDescription: string };
const CATS = ["Itineraries", "Seasons", "Visa & permits", "Packing lists", "Food", "Family travel"];

export function PostEditor({ id, initial, slug }: { id: number | null; initial: Draft; slug?: string }) {
  const [d, setD] = useState(initial);
  const { run, pending, errors } = useSave();
  const router = useRouter();
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const words = d.body.split(/\s+/).filter(Boolean).length;
  const save = (status = d.status) =>
    run(
      () => savePostAction(id, { ...d, status, readMinutes: Math.max(1, Math.round(words / 200)) || d.readMinutes, publishAt: d.publishAt ? new Date(d.publishAt).toISOString() : undefined }),
      (r) => { set("status", status); if (!id && r.data) router.push(`/admin/content/blog/${r.data.id}`); },
    );
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><Link href="/admin/content/blog" className="text-[14px] text-stone">‹ All articles</Link><h1 className="font-display text-[28px] text-teal">{d.title || "New article"}</h1></div>
        <div className="flex gap-2.5">
          {slug && d.status === "published" && <Link href={`/guides/${slug}`} target="_blank" className={abtn.secondary}>View ↗</Link>}
          <button type="button" disabled={pending} className={abtn.secondary} onClick={() => save("draft")}>Save draft</button>
          <button type="button" disabled={pending} className={abtn.secondary} onClick={() => save("scheduled")}>Schedule</button>
          <button type="button" disabled={pending} className={abtn.primary} onClick={() => save("published")}>Publish</button>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Panel title="Article">
          <Input label="Title" value={d.title} onChange={(v) => set("title", v)} error={errors.title} />
          <TextArea label="Excerpt" rows={2} max={240} value={d.excerpt} onChange={(v) => set("excerpt", v)} />
          <TextArea label={`Body · ${words} words`} rows={18} value={d.body} onChange={(v) => set("body", v)} error={errors.body} hint="Separate paragraphs with a blank line. Start a line with “## ” for a heading and “> ” for a pull quote." />
        </Panel>
        <div className="flex flex-col gap-6">
          <Panel title="Publishing">
            <p className="text-[14px]">Status: <strong className="capitalize">{d.status}</strong></p>
            <Input label="Publish at (for scheduling)" type="datetime-local" value={d.publishAt} onChange={(v) => set("publishAt", v)} error={errors.publishAt} />
            <Select label="Category" value={d.category} onChange={(v) => set("category", v)} options={[...new Set([...CATS, d.category])].map((c) => [c, c])} />
            <Input label="Author" value={d.author} onChange={(v) => set("author", v)} />
            <Toggle label="Featured" hint="Leads the Travel guides page." checked={d.featured} onChange={(v) => set("featured", v)} />
          </Panel>
          <Panel title="Hero image">
            <Input label="Alt text" value={d.heroAlt} onChange={(v) => set("heroAlt", v)} error={errors.heroAlt} />
            <Input label="Placeholder colour" value={d.heroColor} onChange={(v) => set("heroColor", v)} />
          </Panel>
          <Panel title="SEO">
            <Input label="URL slug" prefix="/guides/" value={d.slug} onChange={(v) => set("slug", v)} />
            <Input label="SEO title" max={70} value={d.seoTitle} onChange={(v) => set("seoTitle", v)} />
            <TextArea label="Meta description" max={160} rows={3} value={d.seoDescription} onChange={(v) => set("seoDescription", v)} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
