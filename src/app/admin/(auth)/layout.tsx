import type { Metadata } from "next";
import { Logo } from "@/components/site/Logo";

export const metadata: Metadata = { title: "Staff sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-white">
      <aside className="relative hidden w-[47%] flex-col justify-between overflow-hidden bg-gradient-to-b from-teal-soft to-[#10272B] p-14 lg:flex">
        <Logo admin light />
        <div className="relative z-10 flex max-w-[460px] flex-col gap-5">
          <p className="text-[12px] tracking-[0.14em] text-gold uppercase">Staff console</p>
          <p className="font-display text-[52px] leading-[54px] text-ivory">Every enquiry is someone&apos;s next journey.</p>
          <p className="text-[16px] leading-[24px] text-ivory/75">Reply fast, follow up kindly, and keep every traveller&apos;s plan in one place.</p>
        </div>
        <svg viewBox="0 0 680 300" className="absolute inset-x-0 bottom-0 w-full" aria-hidden preserveAspectRatio="none">
          <path d="M0 150 L140 60 L210 110 L330 0 L450 90 L570 30 L680 80 L680 300 L0 300Z" fill="#163B40" opacity="0.6" />
          <path d="M0 210 L150 140 L280 180 L420 120 L560 170 L680 140 L680 300 L0 300Z" fill="#10272B" />
        </svg>
        <p className="relative z-10 text-[13px] text-ivory/60">Photo placeholder · Kerala backwaters at dusk</p>
      </aside>
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-[380px]">
          <div className="mb-10 lg:hidden"><Logo admin /></div>
          {children}
        </div>
      </main>
    </div>
  );
}
