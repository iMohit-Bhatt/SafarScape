import Link from "next/link";

export function Logo({ size = "md", admin, light }: { size?: "md" | "lg"; admin?: boolean; light?: boolean }) {
  return (
    <Link href={admin ? "/admin" : "/"} className="inline-flex items-baseline gap-2.5" aria-label="Safarscape home">
      <span
        className={`font-display tracking-[-0.01em] ${light ? "text-ivory" : "text-teal"} ${
          size === "lg" ? "text-[40px] leading-[48px]" : "text-[24px] leading-[30px] md:text-[28px] md:leading-[34px]"
        }`}
      >
        Safarscape
      </span>
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-gold" />
      {admin && <span className={`text-[13px] ${light ? "text-ivory/80" : "text-stone"}`}>Admin</span>}
    </Link>
  );
}
