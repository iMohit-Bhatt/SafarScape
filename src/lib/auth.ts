import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import type { DB } from "@/db";
import { users, sessions, loginAttempts, passwordResets } from "@/db/schema";

export const SESSION_COOKIE = "sfs_session";
export const MAX_FAILURES = 5;
export const LOCK_MINUTES = 15;
const SHORT_SESSION_H = 12;
const LONG_SESSION_D = 30;

export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
export type StaffUser = typeof users.$inferSelect;

export type LoginResult =
  | { ok: true; user: StaffUser }
  | { ok: false; reason: "invalid" | "locked" | "deactivated"; lockedUntil?: Date; remaining?: number };

export async function authenticate(db: DB, emailRaw: string, password: string): Promise<LoginResult> {
  const email = emailRaw.trim().toLowerCase();
  const [attempt] = await db.select().from(loginAttempts).where(eq(loginAttempts.email, email));
  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    return { ok: false, reason: "locked", lockedUntil: attempt.lockedUntil };
  }
  const [user] = await db.select().from(users).where(eq(users.email, email));
  // Compare against a dummy hash when the user doesn't exist to keep timing similar.
  const valid = await bcrypt.compare(password, user?.passwordHash ?? "$2b$10$CwTycUXWue0Thq9StjUM0uJ8Gq0xH6Yb0Y1rC0iVxv3e7oQ7rC2fG");
  if (!user || !valid) {
    const failures = (attempt && (!attempt.lockedUntil || attempt.lockedUntil < new Date()) ? attempt.failures : 0) + 1;
    const lockedUntil = failures >= MAX_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null;
    await db
      .insert(loginAttempts)
      .values({ email, failures, lockedUntil })
      .onConflictDoUpdate({ target: loginAttempts.email, set: { failures, lockedUntil } });
    if (lockedUntil) return { ok: false, reason: "locked", lockedUntil };
    return { ok: false, reason: "invalid", remaining: MAX_FAILURES - failures };
  }
  if (user.status === "deactivated") return { ok: false, reason: "deactivated" };
  await db.delete(loginAttempts).where(eq(loginAttempts.email, email));
  await db.update(users).set({ lastActiveAt: new Date(), status: "active" }).where(eq(users.id, user.id));
  return { ok: true, user };
}

export async function createSession(db: DB, userId: number, remember: boolean) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (remember ? LONG_SESSION_D * 86400_000 : SHORT_SESSION_H * 3600_000));
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  // Opportunistic cleanup of expired sessions.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  return { token, expiresAt };
}

export async function userForToken(db: DB, token: string | undefined | null): Promise<StaffUser | null> {
  if (!token) return null;
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())));
  const user = rows[0]?.user;
  if (!user || user.status === "deactivated") return null;
  return user;
}

export async function destroySession(db: DB, token: string | undefined | null) {
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export async function destroyUserSessions(db: DB, userId: number) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Creates a single-use reset token (1 hour). Returns null when no active user matches — callers must not reveal that. */
export async function createPasswordReset(db: DB, emailRaw: string) {
  const [user] = await db.select().from(users).where(eq(users.email, emailRaw.trim().toLowerCase()));
  if (!user || user.status === "deactivated") return null;
  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResets).values({ id: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 3600_000) });
  return { token, user };
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Mix letters and at least one number.";
  return null;
}

export async function resetPassword(db: DB, token: string, newPassword: string) {
  const problem = passwordProblem(newPassword);
  if (problem) return { ok: false as const, error: problem };
  const [row] = await db
    .select()
    .from(passwordResets)
    .where(and(eq(passwordResets.id, hashToken(token)), gt(passwordResets.expiresAt, new Date()), isNull(passwordResets.usedAt)));
  if (!row) return { ok: false as const, error: "This reset link has expired or was already used." };
  await db.update(users).set({ passwordHash: await bcrypt.hash(newPassword, 10) }).where(eq(users.id, row.userId));
  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, row.id));
  await destroyUserSessions(db, row.userId);
  const [user] = await db.select().from(users).where(eq(users.id, row.userId));
  await db.delete(loginAttempts).where(eq(loginAttempts.email, user.email));
  return { ok: true as const };
}

export async function changePassword(db: DB, userId: number, current: string, next: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) return { ok: false as const, error: "Current password is wrong." };
  const problem = passwordProblem(next);
  if (problem) return { ok: false as const, error: problem };
  await db.update(users).set({ passwordHash: await bcrypt.hash(next, 10) }).where(eq(users.id, userId));
  return { ok: true as const };
}
