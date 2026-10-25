"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction } from "../../auth-actions";
import { LockIcon } from "@/components/ui/icons";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[36px] leading-[42px] text-teal">Sign in</h1>
        <p className="text-[15px] text-stone">Use the email your agency owner invited.</p>
      </div>
      {notice && !state?.error && <p role="status" className="rounded-[4px] bg-info-bg px-3.5 py-2.5 text-[14px] text-teal">{notice}</p>}
      {state?.error && <p role="alert" className="rounded-[4px] bg-danger-bg px-3.5 py-2.5 text-[14px] text-danger">{state.error}</p>}
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="next" value={next ?? ""} />
        <label className="flex flex-col gap-2 text-[14px] font-medium text-charcoal">
          Work email
          <input name="email" type="email" autoComplete="username" required defaultValue={state?.email} className="field-input" />
        </label>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-[14px]">
            <label htmlFor="password" className="font-medium text-charcoal">Password</label>
            <Link href="/admin/forgot" className="text-teal">Forgot password?</Link>
          </div>
          <div className="relative">
            <input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required className="field-input pr-16" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-charcoal">{show ? "Hide" : "Show"}</button>
          </div>
        </div>
        <label className="flex items-center gap-2.5 text-[14px] text-charcoal">
          <input type="checkbox" name="remember" defaultChecked className="h-4 w-4 accent-teal" /> Remember this device for 30 days
        </label>
        <button type="submit" disabled={pending} className="rounded-[4px] bg-teal py-3.5 text-[15px] font-medium text-ivory disabled:opacity-60">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="flex gap-3 rounded-[4px] bg-admin-bg p-4 text-[13px] leading-5 text-stone">
        <LockIcon className="mt-0.5 h-4 w-4 shrink-0" />
        Access is by invitation only. Need an account? Ask your agency owner to invite you from Team &amp; roles.
      </p>
    </div>
  );
}
