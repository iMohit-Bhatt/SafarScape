import Link from "next/link";
import { LockIcon } from "@/components/ui/icons";
import { abtn } from "@/components/admin/ui";

export default function DeniedPage() {
  return (
    <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4 py-24 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-warning-bg text-warning"><LockIcon className="h-6 w-6" /></span>
      <h1 className="font-display text-[30px] text-teal">You don&apos;t have access to this page</h1>
      <p className="text-[15px] text-stone">Your role doesn&apos;t include this area. If you need it, ask your agency owner to change your role in Team &amp; roles.</p>
      <Link href="/admin" className={abtn.primary}>Back to dashboard</Link>
    </div>
  );
}
