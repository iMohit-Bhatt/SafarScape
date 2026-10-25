import Link from "next/link";
import { getDb } from "@/db";
import { requirePageUser } from "@/lib/session";
import { listPosts } from "@/lib/admin-content";
import { formatDate } from "@/lib/format";
import { PageHeader, PubBadge, Th, Td, abtn } from "@/components/admin/ui";
import { PlusIcon } from "@/components/ui/icons";

export const metadata = { title: "Blog" };

export default async function BlogAdmin() {
  await requirePageUser("content.edit");
  const posts = await listPosts(await getDb());
  return (
    <div>
      <PageHeader title="Blog & travel guides" subtitle="Articles appear under Travel guides on the site." actions={<Link href="/admin/content/blog/new" className={abtn.primary}><PlusIcon /> New article</Link>} />
      <div className="overflow-x-auto rounded-[8px] border border-line bg-white">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-line"><tr><Th>Title</Th><Th>Category</Th><Th>Status</Th><Th>Publish date</Th><Th>Updated</Th></tr></thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <Td><Link href={`/admin/content/blog/${p.id}`} className="font-medium hover:underline">{p.title}</Link>{p.featured && <span className="ml-2 text-[12px] text-gold">★ Featured</span>}</Td>
                <Td>{p.category}</Td>
                <Td><PubBadge status={p.status} /></Td>
                <Td>{formatDate(p.publishAt, p.status === "scheduled")}</Td>
                <Td className="text-stone">{formatDate(p.updatedAt)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
