import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { SESSION_COOKIE, userForToken, type StaffUser } from "./auth";
import { can, ForbiddenError, type Capability } from "./permissions";

/** The signed-in staff member, or null. */
export async function currentUser(): Promise<StaffUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return userForToken(await getDb(), token);
}

/** For admin pages: redirects to login (or access denied) instead of throwing. */
export async function requirePageUser(cap?: Capability): Promise<StaffUser> {
  const user = await currentUser();
  if (!user) redirect("/admin/login?expired=1");
  if (cap && !can(user.role, cap)) redirect(`/admin/denied?need=${cap}`);
  return user;
}

/** For server actions / route handlers: throws so nothing runs without permission. */
export async function requireUser(cap?: Capability): Promise<StaffUser> {
  const user = await currentUser();
  if (!user) throw new ForbiddenError("signed-in");
  if (cap && !can(user.role, cap)) throw new ForbiddenError(cap);
  return user;
}
