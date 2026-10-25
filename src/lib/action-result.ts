import "server-only";
import { ForbiddenError } from "./permissions";
import { ValidationError } from "./admin-catalogue";
import { LeadError } from "./leads";

export type ActionResult<T = unknown> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; forbidden?: boolean };

/** Runs an admin mutation and turns known errors into user-facing messages. Unknown errors are logged, not exposed. */
export async function run<T>(fn: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, message, data };
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, forbidden: true, error: "Your role doesn't allow this. Ask an owner or manager." };
    if (e instanceof ValidationError) return { ok: false, error: e.message, fieldErrors: e.fieldErrors };
    if (e instanceof LeadError) return { ok: false, error: e.message };
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
    console.error("[admin action] unexpected", e);
    return { ok: false, error: "Something went wrong and nothing was saved. Try again." };
  }
}

/** Drops the payload so only the outcome crosses to the client. */
export const strip = <T,>(r: ActionResult<T>): ActionResult => (r.ok ? { ok: true, message: r.message } : r);
