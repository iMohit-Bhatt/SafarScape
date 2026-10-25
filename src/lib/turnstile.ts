/**
 * Cloudflare Turnstile verification. Only enforced when TURNSTILE_SECRET_KEY is set;
 * without it the check is skipped (local development) and that is logged once.
 */
let warned = false;
export function turnstileEnabled() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstile(token: string | null | undefined, ip?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (!warned) {
      console.warn("[turnstile] TURNSTILE_SECRET_KEY not set — spam check skipped.");
      warned = true;
    }
    return true;
  }
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (e) {
    console.error("[turnstile] verification error", e);
    return false;
  }
}
