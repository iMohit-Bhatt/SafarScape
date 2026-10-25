"use client";
import Link from "next/link";
import { useActionState } from "react";
import { resetAction } from "../../auth-actions";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetAction, undefined);
  if (!token)
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-[34px] text-teal">Link not valid</h1>
        <p className="text-[15px] text-stone">This reset link is missing its token. Request a new one.</p>
        <Link href="/admin/forgot" className="text-[14px] font-medium text-teal">Request a new link →</Link>
      </div>
    );
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[34px] leading-[40px] text-teal">Choose a new password</h1>
        <p className="text-[15px] text-stone">At least 10 characters, with letters and a number.</p>
      </div>
      {state?.error && <p role="alert" className="rounded-[4px] bg-danger-bg px-3.5 py-2.5 text-[14px] text-danger">{state.error} {state.error.includes("expired") && <Link href="/admin/forgot" className="underline">Get a new link</Link>}</p>}
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="token" value={token} />
        <label className="flex flex-col gap-2 text-[14px] font-medium text-charcoal">New password<input name="password" type="password" autoComplete="new-password" minLength={10} required className="field-input" /></label>
        <label className="flex flex-col gap-2 text-[14px] font-medium text-charcoal">Confirm password<input name="confirm" type="password" autoComplete="new-password" required className="field-input" /></label>
        <button disabled={pending} className="rounded-[4px] bg-teal py-3.5 text-[15px] font-medium text-ivory disabled:opacity-60">{pending ? "Saving…" : "Save password"}</button>
      </form>
    </div>
  );
}
