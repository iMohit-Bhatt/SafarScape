"use client";
import { abtn } from "@/components/admin/ui";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4 py-24 text-center">
      <p className="text-[12px] uppercase tracking-[0.14em] text-stone">500</p>
      <h1 className="font-display text-[30px] text-teal">Something went wrong</h1>
      <p className="text-[15px] text-stone">Nothing you were editing was saved. Try again — if it keeps happening, share this code with whoever set up the site: <code>{error.digest ?? "n/a"}</code></p>
      <button type="button" onClick={reset} className={abtn.primary}>Try again</button>
    </div>
  );
}
