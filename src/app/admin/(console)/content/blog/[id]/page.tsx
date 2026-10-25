import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { posts } from "@/db/schema";
import { requirePageUser } from "@/lib/session";
import { PostEditor } from "./PostEditor";

export const metadata = { title: "Article" };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageUser("content.edit");
  const raw = (await params).id;
  if (raw === "new") return <PostEditor id={null} initial={{ title: "", slug: "", category: "Itineraries", excerpt: "", body: "", author: "Safarscape team", readMinutes: 5, heroColor: "#DCD6C2", heroAlt: "", status: "draft", publishAt: "", featured: false, seoTitle: "", seoDescription: "" }} />;
  const [p] = await (await getDb()).select().from(posts).where(eq(posts.id, Number(raw)));
  if (!p) notFound();
  const local = p.publishAt ? new Date(p.publishAt.getTime() - p.publishAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
  return <PostEditor id={p.id} slug={p.slug} initial={{ title: p.title, slug: p.slug, category: p.category, excerpt: p.excerpt, body: p.body, author: p.author, readMinutes: p.readMinutes, heroColor: p.hero.color, heroAlt: p.hero.alt, status: p.status, publishAt: local, featured: p.featured, seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "" }} />;
}
