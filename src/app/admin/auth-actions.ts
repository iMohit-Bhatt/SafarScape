"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  authenticate,
  createSession,
  destroySession,
  createPasswordReset,
  resetPassword,
  SESSION_COOKIE,
  LOCK_MINUTES,
} from "@/lib/auth";
import { sendLogged } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export type AuthState = { error?: string; email?: string; sent?: boolean } | undefined;

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/admin") && !s.startsWith("//") ? s : "/admin";
};

export async function loginAction(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const remember = form.get("remember") === "on";
  if (!email || !password) return { error: "Enter your work email and password.", email };
  const db = await getDb();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!(await rateLimit(db, `login:ip:${ip}`, 30, 900))) return { error: "Too many sign-in attempts from this network. Try again in 15 minutes.", email };
  const r = await authenticate(db, email, password);
  if (!r.ok) {
    if (r.reason === "locked") return { error: `Too many failed attempts. This account is locked for ${LOCK_MINUTES} minutes — or reset your password.`, email };
    if (r.reason === "deactivated") return { error: "This account has been deactivated. Ask your agency owner.", email };
    return { error: `That email and password don't match.${r.remaining && r.remaining <= 2 ? ` ${r.remaining} attempt${r.remaining > 1 ? "s" : ""} left before a 15-minute lock.` : ""}`, email };
  }
  const { token, expiresAt } = await createSession(db, r.user.id, remember);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { expires: expiresAt } : {}),
  });
  redirect(safeNext(form.get("next")));
}

export async function logoutAction() {
  const jar = await cookies();
  await destroySession(await getDb(), jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  redirect("/admin/login?signedout=1");
}

export async function forgotAction(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter the email you sign in with.", email };
  const db = await getDb();
  if (await rateLimit(db, `reset:${email.toLowerCase()}`, 3, 3600)) {
    const r = await createPasswordReset(db, email);
    if (r) {
      const h = await headers();
      const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
      await sendLogged(
        db,
        {
          to: r.user.email,
          subject: "Reset your Safarscape password",
          text: `Hi ${r.user.name},\n\nReset your password here (valid for 1 hour):\n${origin}/admin/reset?token=${r.token}\n\nIf you didn't ask for this, ignore this email.`,
        },
        { kind: "reset" },
      );
    }
  }
  // Same response whether or not the account exists.
  return { sent: true, email };
}

export async function resetAction(_: AuthState, form: FormData): Promise<AuthState> {
  const token = String(form.get("token") ?? "");
  const pw = String(form.get("password") ?? "");
  if (pw !== String(form.get("confirm") ?? "")) return { error: "The two passwords don't match." };
  const r = await resetPassword(await getDb(), token, pw);
  if (!r.ok) return { error: r.error };
  redirect("/admin/login?reset=1");
}
