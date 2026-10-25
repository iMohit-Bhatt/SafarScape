"use client";
import Link from "next/link";
import { useActionState } from "react";
import { forgotAction } from "../../auth-actions";

export default function ForgotPage() {
  const [state, action, pending] = useActionState(forgotAction, undefined);
  if (state?.sent)
    return (
      <div className="flex flex-col gap-4" role="status">
        <h1 className="font-display text-[34px] leading-[40px] text-teal">Check your inbox</h1>
        <p className="text-[15px] leading-6 text-stone">If <strong className="text-charcoal">{state.email}</strong> belongs to a team member, a reset link is on its way. It works for one hour.</p>
        <Link href="/admin/login" className="text-[14px] font-medium text-teal">← Back to sign in</Link>
      </div>
    );
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[34px] leading-[40px] text-teal">Reset your password</h1>
        <p className="text-[15px] text-stone">We&apos;ll email you a link to choose a new one.</p>
      </div>
      {state?.error && <p role="alert" className="rounded-[4px] bg-danger-bg px-3.5 py-2.5 text-[14px] text-danger">{state.error}</p>}
      <form action={action} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2 text-[14px] font-medium text-charcoal">
          Work email
          <input name="email" type="email" required defaultValue={state?.email} className="field-input" />
        </label>
        <button disabled={pending} className="rounded-[4px] bg-teal py-3.5 text-[15px] font-medium text-ivory disabled:opacity-60">{pending ? "Sending…" : "Send reset link"}</button>
      </form>
      <Link href="/admin/login" className="text-[14px] font-medium text-teal">← Back to sign in</Link>
    </div>
  );
}
