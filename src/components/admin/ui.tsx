import Link from "next/link";
import type { LeadStatus, PublishStatus } from "@/db/schema";
import { initials } from "@/lib/format";

export const abtn = {
  primary: "inline-flex items-center justify-center gap-2 rounded-[4px] bg-teal px-5 py-2.5 text-[15px] font-medium text-ivory hover:bg-teal-soft disabled:opacity-60 disabled:cursor-not-allowed",
  secondary: "inline-flex items-center justify-center gap-2 rounded-[4px] border border-line bg-white px-5 py-2.5 text-[15px] font-medium text-charcoal hover:border-stone disabled:opacity-60",
  danger: "inline-flex items-center justify-center gap-2 rounded-[4px] border border-danger/40 bg-white px-4 py-2 text-[14px] font-medium text-danger hover:bg-danger-bg disabled:opacity-60",
  small: "inline-flex items-center justify-center gap-1.5 rounded-[4px] border border-line bg-white px-3 py-1.5 text-[13px] text-charcoal hover:border-stone disabled:opacity-60",
  ghost: "inline-flex items-center gap-1.5 text-[14px] font-medium text-teal hover:underline",
};

export const statusStyle: Record<LeadStatus, string> = {
  new: "bg-info-bg text-teal",
  contacted: "bg-warning-bg text-warning",
  quoted: "bg-quoted-bg text-quoted",
  converted: "bg-success-bg text-success",
  lost: "bg-danger-bg text-danger",
};
const statusLabel: Record<LeadStatus, string> = { new: "New", contacted: "Contacted", quoted: "Quoted", converted: "Converted", lost: "Lost" };

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`inline-block rounded-[3px] px-2 py-0.5 text-[13px] ${statusStyle[status]}`}>{statusLabel[status]}</span>;
}

const pubStyle: Record<string, string> = {
  published: "bg-success-bg text-success",
  draft: "bg-admin-bg text-stone border border-line",
  unpublished: "bg-warning-bg text-warning",
  archived: "bg-admin-bg text-stone",
  scheduled: "bg-info-bg text-teal",
  live: "bg-success-bg text-success",
  pending: "bg-warning-bg text-warning",
  approved: "bg-success-bg text-success",
  rejected: "bg-danger-bg text-danger",
};
export function PubBadge({ status }: { status: PublishStatus | string }) {
  return <span className={`inline-block rounded-[3px] px-2 py-0.5 text-[12px] capitalize ${pubStyle[status] ?? "bg-admin-bg text-stone"}`}>{status}</span>;
}

export function Avatar({ name, size = "sm", dark }: { name: string | null | undefined; size?: "sm" | "md"; dark?: boolean }) {
  if (!name) return <span className="text-stone">—</span>;
  return (
    <span
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium ${size === "md" ? "h-9 w-9 text-[13px]" : "h-7 w-7 text-[11px]"} ${dark ? "bg-teal text-ivory" : "bg-quoted-bg text-quoted"}`}
    >
      {initials(name)}
    </span>
  );
}

export function Card({ title, action, children, className = "", pad = true }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`rounded-[8px] border border-line bg-white ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          {typeof title === "string" ? <h2 className="text-[17px] font-medium text-charcoal">{title}</h2> : title}
          {action}
        </div>
      )}
      <div className={pad ? "p-6" : ""}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions, back }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col justify-between gap-4 pb-6 md:flex-row md:items-end">
      <div className="flex flex-col gap-1">
        {back && <Link href={back.href} className="mb-2 text-[14px] text-stone hover:text-teal">‹ {back.label}</Link>}
        <h1 className="font-display text-[28px] leading-[34px] text-teal">{title}</h1>
        {subtitle && <p className="text-[15px] text-stone">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}

export function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-left text-[12px] font-normal tracking-[0.1em] text-stone uppercase first:pl-6 last:pr-6 ${className}`}>{children}</th>;
}
export function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 text-[14px] text-charcoal first:pl-6 last:pr-6 ${className}`}>{children}</td>;
}

export function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <p className="font-display text-[22px] text-teal">{title}</p>
      <p className="max-w-[420px] text-[14px] text-stone">{body}</p>
      {action}
    </div>
  );
}

export function SourceDot({ source }: { source: string }) {
  const c: Record<string, string> = { instagram: "#B4532A", google: "#2F6B45", whatsapp: "#1A7A43", facebook: "#3E5C9A", referral: "#C9A227", direct: "#6B6760" };
  return (
    <span className="inline-flex items-center gap-1.5 capitalize">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c[source] ?? "#6B6760" }} />
      {source}
    </span>
  );
}
