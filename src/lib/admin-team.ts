import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, ne, sql, asc } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@/db";
import { users, enquiries, type Role } from "@/db/schema";
import type { StaffUser } from "./auth";
import { createPasswordReset, destroyUserSessions } from "./auth";
import { can, ForbiddenError } from "./permissions";
import { ValidationError } from "./admin-catalogue";
import { sendLogged } from "./email";

function assertOwner(actor: StaffUser) {
  if (!can(actor.role, "settings.team")) throw new ForbiddenError("settings.team");
}

export async function listTeam(db: DB) {
  return db
    .select({
      u: users,
      openLeads: sql<number>`(select count(*)::int from ${enquiries} where ${enquiries.assigneeId} = ${users.id} and ${enquiries.status} in ('new','contacted','quoted'))`,
    })
    .from(users)
    .orderBy(asc(users.name));
}

const inviteInput = z.object({
  name: z.string().trim().min(2, "Add their name."),
  email: z.email("Enter a work email.").transform((e) => e.toLowerCase()),
  role: z.enum(["owner", "manager", "sales"]),
});

export async function inviteMember(db: DB, actor: StaffUser, raw: unknown, siteUrl: string) {
  assertOwner(actor);
  const r = inviteInput.safeParse(raw);
  if (!r.success) throw new ValidationError({ [String(r.error.issues[0].path[0])]: r.error.issues[0].message });
  const [exists] = await db.select().from(users).where(eq(users.email, r.data.email));
  if (exists) throw new ValidationError({ email: "Someone with this email is already on the team." });
  const [u] = await db
    .insert(users)
    .values({ ...r.data, status: "invited", passwordHash: await bcrypt.hash(randomBytes(24).toString("hex"), 10) })
    .returning();
  const reset = await createPasswordReset(db, u.email);
  await sendLogged(
    db,
    {
      to: u.email,
      subject: "You've been invited to Safarscape admin",
      text: `Hi ${u.name},\n\n${actor.name} invited you to the Safarscape staff console as ${r.data.role}.\nSet your password (link valid 1 hour): ${siteUrl}/admin/reset?token=${reset!.token}\n`,
    },
    { kind: "reset" },
  );
  return u;
}

async function ownersLeft(db: DB, exceptId: number) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, "owner"), ne(users.status, "deactivated"), ne(users.id, exceptId)));
  return n;
}

export async function changeRole(db: DB, actor: StaffUser, userId: number, role: Role) {
  assertOwner(actor);
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u) throw new ValidationError({ form: "Not found." });
  if (u.role === "owner" && role !== "owner" && (await ownersLeft(db, userId)) === 0)
    throw new ValidationError({ form: "There must always be at least one owner." });
  return (await db.update(users).set({ role }).where(eq(users.id, userId)).returning())[0];
}

export async function setActive(db: DB, actor: StaffUser, userId: number, active: boolean) {
  assertOwner(actor);
  if (userId === actor.id && !active) throw new ValidationError({ form: "You can't deactivate yourself." });
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u) throw new ValidationError({ form: "Not found." });
  if (!active && u.role === "owner" && (await ownersLeft(db, userId)) === 0)
    throw new ValidationError({ form: "There must always be at least one owner." });
  await db.update(users).set({ status: active ? "active" : "deactivated" }).where(eq(users.id, userId));
  if (!active) {
    await destroyUserSessions(db, userId);
    // Hand their open leads back to the unassigned queue so nothing is dropped.
    await db
      .update(enquiries)
      .set({ assigneeId: null })
      .where(and(eq(enquiries.assigneeId, userId), sql`${enquiries.status} in ('new','contacted','quoted')`));
  }
}

export async function updateProfile(db: DB, actor: StaffUser, raw: unknown) {
  const r = z.object({ name: z.string().trim().min(2), phone: z.string().trim().max(20).optional() }).safeParse(raw);
  if (!r.success) throw new ValidationError({ name: "Add your name." });
  return (await db.update(users).set({ name: r.data.name, phone: r.data.phone || null }).where(eq(users.id, actor.id)).returning())[0];
}
