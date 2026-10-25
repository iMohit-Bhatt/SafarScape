"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  GridIcon, MailIcon, BagIcon, PinIcon, PenIcon, QuoteIcon, ImageIcon, TagIcon, ChartIcon, UsersIcon, HomeIcon, MenuIcon, CloseIcon, WhatsAppIcon,
} from "@/components/ui/icons";
import { Logo } from "@/components/site/Logo";
import type { Capability } from "@/lib/permissions";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; cap?: Capability; badge?: number };

export function navGroups(newLeads: number): { title: string; items: Item[] }[] {
  return [
    { title: "Main", items: [
      { href: "/admin", label: "Dashboard", icon: GridIcon },
      { href: "/admin/leads", label: "Leads", icon: MailIcon, badge: newLeads },
      { href: "/admin/packages", label: "Packages", icon: BagIcon },
      { href: "/admin/destinations", label: "Destinations", icon: PinIcon },
    ] },
    { title: "Content", items: [
      { href: "/admin/content/blog", label: "Blog", icon: PenIcon, cap: "content.edit" },
      { href: "/admin/content/testimonials", label: "Testimonials", icon: QuoteIcon, cap: "content.edit" },
      { href: "/admin/content/gallery", label: "Gallery", icon: ImageIcon, cap: "content.edit" },
      { href: "/admin/content/banners", label: "Banners & offers", icon: TagIcon, cap: "content.edit" },
    ] },
    { title: "Insights", items: [{ href: "/admin/reports", label: "Reports", icon: ChartIcon, cap: "reports.view" }] },
    { title: "Settings", items: [
      { href: "/admin/settings/team", label: "Team & roles", icon: UsersIcon, cap: "settings.team" },
      { href: "/admin/settings/email", label: "Email & routing", icon: MailIcon, cap: "settings.email" },
      { href: "/admin/settings/agency", label: "Agency & WhatsApp", icon: WhatsAppIcon, cap: "settings.agency" },
      { href: "/admin/settings/account", label: "My account", icon: HomeIcon },
    ] },
  ];
}

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ allowed, newLeads, footer }: { allowed: Capability[]; newLeads: number; footer: React.ReactNode }) {
  const pathname = usePathname();
  const groups = navGroups(newLeads)
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.cap || allowed.includes(i.cap)) }))
    .filter((g) => g.items.length);
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-6 pt-7"><Logo admin /></div>
      <nav aria-label="Admin" className="flex flex-1 flex-col gap-6 overflow-y-auto px-3">
        {groups.map((g) => (
          <div key={g.title} className="flex flex-col gap-1">
            <p className="px-3 pb-1 text-[12px] tracking-[0.12em] text-stone uppercase">{g.title}</p>
            {g.items.map((i) => {
              const active = isActive(pathname, i.href);
              const Icon = i.icon;
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-3 rounded-[4px] px-3 py-2.5 text-[15px] ${active ? "bg-info-bg font-medium text-teal before:absolute before:-left-3 before:top-0 before:h-full before:w-[3px] before:bg-teal" : "text-charcoal hover:bg-admin-bg"}`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="flex-1">{i.label}</span>
                  {i.badge ? <span className={`rounded-full px-2 py-0.5 text-[12px] ${active ? "bg-teal text-ivory" : "bg-info-bg text-teal"}`}>{i.badge}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-line px-3 py-4">{footer}</div>
    </div>
  );
}

export function MobileNav({ allowed, newLeads, footer }: { allowed: Capability[]; newLeads: number; footer: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpen(false);
  }
  const tabs = [
    { href: "/admin", label: "Home", icon: GridIcon },
    { href: "/admin/leads", label: "Leads", icon: MailIcon, badge: newLeads },
    { href: "/admin/packages", label: "Packages", icon: BagIcon },
  ];
  return (
    <>
      <nav aria-label="Admin tabs" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-white lg:hidden">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = isActive(pathname, t.href);
          return (
            <Link key={t.href} href={t.href} className={`relative flex flex-col items-center gap-1 py-2.5 text-[12px] ${active ? "text-teal" : "text-stone"}`}>
              <Icon className="h-5 w-5" />
              {t.label}
              {t.badge ? <span className="absolute right-[28%] top-1.5 rounded-full bg-teal px-1.5 text-[10px] text-ivory">{t.badge}</span> : null}
            </Link>
          );
        })}
        <button type="button" onClick={() => setOpen(true)} className="flex flex-col items-center gap-1 py-2.5 text-[12px] text-stone" aria-expanded={open}>
          <MenuIcon className="h-5 w-5" /> More
        </button>
      </nav>
      {open && (
        <div className="fixed inset-0 z-50 bg-charcoal/40 lg:hidden" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Admin menu" className="h-full w-[280px] bg-white" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="absolute left-[290px] top-4 text-ivory"><CloseIcon className="h-6 w-6" /></button>
            <SidebarNav allowed={allowed} newLeads={newLeads} footer={footer} />
          </div>
        </div>
      )}
    </>
  );
}
