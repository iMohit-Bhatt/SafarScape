import Link from "next/link";
import { abtn } from "@/components/admin/ui";

export default function AdminNotFound() {
  return (
    <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4 py-24 text-center">
      <p className="text-[12px] uppercase tracking-[0.14em] text-stone">404</p>
      <h1 className="font-display text-[30px] text-teal">We couldn&apos;t find that</h1>
      <p className="text-[15px] text-stone">It may have been deleted, or it&apos;s assigned to someone else and your role can&apos;t see it.</p>
      <Link href="/admin" className={abtn.primary}>Back to dashboard</Link>
    </div>
  );
}
