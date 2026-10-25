import Link from "next/link";

export function SectionHead({ eyebrow, title, link, border = true }: { eyebrow?: string; title: string; link?: { href: string; label: string }; border?: boolean }) {
  return (
    <div className={`flex flex-col justify-between gap-4 sm:flex-row sm:items-end ${border ? "border-b border-line pb-6" : ""}`}>
      <div className="flex flex-col gap-3">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="font-display text-[34px] leading-[38px] tracking-[-0.02em] text-teal md:text-[48px] md:leading-[52px]">{title}</h2>
      </div>
      {link && (
        <Link href={link.href} className="link-underline shrink-0 self-start text-[15px] font-medium text-teal sm:self-auto">
          {link.label}
        </Link>
      )}
    </div>
  );
}
