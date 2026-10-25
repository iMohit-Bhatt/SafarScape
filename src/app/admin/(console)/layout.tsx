import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, inArray, lte, sql, like } from "drizzle-orm";
import { getDb } from "@/db";
import { enquiries } from "@/db/schema";
import { requirePageUser } from "@/lib/session";
import { can, capabilities, roleLabels, type Capability } from "@/lib/permissions";
import { SidebarNav, MobileNav } from "@/components/admin/AdminNav";
import { Avatar } from "@/components/admin/ui";
import { BellIcon, ExternalIcon, SearchIcon } from "@/components/ui/icons";
import { logoutAction } from "../auth-actions";
import { ToastProvider } from "@/components/admin/Toast";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Safarscape admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  const db = await getDb();
  const scope = can(user.role, "leads.viewAll") ? undefined : sql`(${enquiries.assigneeId} = ${user.id} or ${enquiries.assigneeId} is null)`;
  const [{ n: newLeads }] = await db.select({ n: sql<number>`count(*)::int` }).from(enquiries).where(and(eq(enquiries.status, "new"), scope));
  const [{ n: due }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(enquiries)
    .where(and(lte(enquiries.followUpAt, new Date()), inArray(enquiries.status, ["new", "contacted", "quoted"]), scope));
  const [{ n: demo }] = await db.select({ n: sql<number>`count(*)::int` }).from(enquiries).where(like(enquiries.name, "Demo lead%"));
  const allowed = (Object.keys(capabilities) as Capability[]).filter((c) => can(user.role, c));

  const footer = (
    <div className="flex items-center gap-3 px-3">
      <Avatar name={user.name} size="md" dark />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] text-charcoal">{user.name}</span>
        <span className="text-[13px] text-stone">{roleLabels[user.role]}</span>
      </div>
      <form action={logoutAction}>
        <button className="text-[13px] text-stone hover:text-teal">Sign out</button>
      </form>
    </div>
  );

  return (
    <ToastProvider>
    <div className="flex min-h-dvh bg-admin-bg">
      <aside className="sticky top-0 hidden h-dvh w-[240px] shrink-0 border-r border-line bg-white lg:block">
        <SidebarNav allowed={allowed} newLeads={newLeads} footer={footer} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-line bg-white px-4 md:px-8">
          <form action="/admin/leads" role="search" className="flex max-w-[420px] flex-1 items-center gap-2 rounded-[4px] border border-line bg-white px-3 py-2">
            <SearchIcon className="h-4 w-4 text-stone" />
            <input name="q" aria-label="Search leads" placeholder="Search leads by name, phone, reference…" className="w-full bg-transparent text-[14px] outline-none placeholder:text-stone" />
          </form>
          <div className="ml-auto flex items-center gap-5">
            <Link href="/" target="_blank" className="hidden items-center gap-1 text-[14px] text-teal sm:flex">View site <ExternalIcon /></Link>
            <Link href="/admin/leads?tab=followups" aria-label={`${due} follow-ups due`} className="relative text-charcoal">
              <BellIcon className="h-5 w-5" />
              {due > 0 && <span className="absolute -right-1.5 -top-1.5 rounded-full bg-danger px-1 text-[10px] text-white">{due}</span>}
            </Link>
            {demo > 0 && <span className="hidden rounded-full bg-admin-bg px-3 py-1 text-[12px] text-stone md:inline" title="Sample leads and content are loaded">Demo data</span>}
          </div>
        </header>
        <main id="main" className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pt-8 lg:pb-12">{children}</main>
      </div>
      <MobileNav allowed={allowed} newLeads={newLeads} footer={footer} />
    </div>
    </ToastProvider>
  );
}
