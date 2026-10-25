"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { btn } from "@/components/ui/buttons";
import { CloseIcon, MenuIcon, WhatsAppIcon } from "@/components/ui/icons";
import { track } from "./analytics-client";

export const navLinks = [
  { href: "/packages", label: "Packages" },
  { href: "/destinations", label: "Destinations" },
  { href: "/custom-trip", label: "Custom trip" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ whatsappHref }: { whatsappHref: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="border-b border-line bg-ivory">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <div className="page-x container-x flex items-center justify-between py-4 md:py-7">
        <Logo />
        <nav aria-label="Main" className="hidden gap-10 lg:flex">
          {navLinks.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`text-[15px] leading-[18px] text-charcoal hover:text-teal ${active ? "underline decoration-gold underline-offset-[10px]" : ""}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-5 lg:flex">
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("whatsapp_click", { placement: "header" })}
              className="text-[15px] text-stone hover:text-whatsapp"
            >
              WhatsApp us
            </a>
          )}
          <Link href="/custom-trip" className={btn.primarySm}>
            Plan my trip
          </Link>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 text-[15px] text-charcoal lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(true)}
        >
          Menu <MenuIcon className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 flex flex-col bg-ivory lg:hidden">
          <div className="page-x flex items-center justify-between border-b border-line py-4">
            <Logo />
            <button type="button" onClick={() => setOpen(false)} className="flex items-center gap-2 text-[15px]" aria-label="Close menu">
              Close <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <nav aria-label="Mobile" className="page-x flex flex-1 flex-col pt-6">
            {navLinks.map((l, i) => (
              <Link key={l.href} href={l.href} className="flex items-baseline gap-4 border-b border-line py-4">
                <span className="text-[13px] text-stone">0{i + 1}</span>
                <span className="font-display text-[32px] leading-[38px] text-teal">{l.label}</span>
              </Link>
            ))}
            <Link href="/guides" className="py-4 text-[16px] text-charcoal">Travel guides</Link>
            <Link href="/reviews" className="py-1 text-[16px] text-charcoal">Reviews</Link>
          </nav>
          <div className="page-x flex flex-col gap-3 pb-8">
            <Link href="/custom-trip" className={btn.primary}>Plan my trip</Link>
            {whatsappHref && (
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={btn.whatsapp}>
                <WhatsAppIcon /> Message us on WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
