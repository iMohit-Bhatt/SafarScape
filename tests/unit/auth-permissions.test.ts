import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { seededDb } from "../helpers/db";
import {
  authenticate,
  createSession,
  userForToken,
  destroySession,
  createPasswordReset,
  resetPassword,
  MAX_FAILURES,
} from "@/lib/auth";
import { DEMO_PASSWORD } from "@/db/seed";
import { users, enquiries } from "@/db/schema";
import { can, ForbiddenError } from "@/lib/permissions";
import { listLeads, assignLead, exportLeadsCsv, getLead } from "@/lib/leads";
import { savePackage, setPackageStatus } from "@/lib/admin-catalogue";
import { changeRole, setActive } from "@/lib/admin-team";

const staff = async (email: string) => {
  const db = await seededDb();
  return (await db.select().from(users).where(eq(users.email, email)))[0];
};

describe("staff login", () => {
  it("signs in with the right password and creates a session", async () => {
    const db = await seededDb();
    const r = await authenticate(db, "Priya@Safarscape.test ", DEMO_PASSWORD);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const { token } = await createSession(db, r.user.id, false);
    expect((await userForToken(db, token))?.email).toBe("priya@safarscape.test");
    await destroySession(db, token);
    expect(await userForToken(db, token)).toBeNull();
    expect(await userForToken(db, "forged-token")).toBeNull();
  });

  it("locks the account after repeated failures", async () => {
    const db = await seededDb();
    let last;
    for (let i = 0; i < MAX_FAILURES; i++) last = await authenticate(db, "neha@safarscape.test", "wrong-password");
    expect(last).toMatchObject({ ok: false, reason: "locked" });
    // Even the right password is refused while locked.
    expect(await authenticate(db, "neha@safarscape.test", DEMO_PASSWORD)).toMatchObject({ ok: false, reason: "locked" });
  });

  it("resets a password with a single-use token", async () => {
    const db = await seededDb();
    const reset = await createPasswordReset(db, "arjun@safarscape.test");
    expect(reset).not.toBeNull();
    expect(await createPasswordReset(db, "nobody@example.com")).toBeNull();
    expect(await resetPassword(db, reset!.token, "short")).toMatchObject({ ok: false });
    expect(await resetPassword(db, reset!.token, "NewPassword2027")).toEqual({ ok: true });
    expect(await resetPassword(db, reset!.token, "AnotherOne2027")).toMatchObject({ ok: false });
    expect((await authenticate(db, "arjun@safarscape.test", "NewPassword2027")).ok).toBe(true);
  });
});

describe("role permissions (server-side)", () => {
  it("matches the roles matrix", () => {
    expect(can("sales", "leads.view")).toBe(true);
    expect(can("sales", "leads.export")).toBe(false);
    expect(can("sales", "catalogue.publish")).toBe(false);
    expect(can("manager", "catalogue.publish")).toBe(true);
    expect(can("manager", "settings.team")).toBe(false);
    expect(can("owner", "settings.team")).toBe(true);
    expect(can(null, "leads.view")).toBe(false);
  });

  it("sales only sees their own and unassigned leads", async () => {
    const db = await seededDb();
    const arjun = await staff("arjun@safarscape.test");
    const { rows } = await listLeads(db, arjun, { pageSize: 500 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.lead.assigneeId === null || r.lead.assigneeId === arjun.id)).toBe(true);
    const nehaLead = (await db.select().from(enquiries).where(eq(enquiries.assigneeId, (await staff("neha@safarscape.test")).id)))[0];
    expect(await getLead(db, arjun, nehaLead.id)).toBeNull();
  });

  it("sales cannot reassign, export, publish or manage the team", async () => {
    const db = await seededDb();
    const arjun = await staff("arjun@safarscape.test");
    const priya = await staff("priya@safarscape.test");
    const own = (await db.select().from(enquiries).where(eq(enquiries.assigneeId, arjun.id)))[0];
    await expect(assignLead(db, arjun, own.id, priya.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(exportLeadsCsv(db, arjun)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(setPackageStatus(db, arjun, 1, "unpublished")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(savePackage(db, arjun, 1, {})).rejects.toBeInstanceOf(ForbiddenError);
    await expect(changeRole(db, arjun, arjun.id, "owner")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("sales can claim an unassigned lead for themselves", async () => {
    const db = await seededDb();
    const arjun = await staff("arjun@safarscape.test");
    const free = (await db.select().from(enquiries)).find((e) => e.assigneeId === null)!;
    const updated = await assignLead(db, arjun, free.id, arjun.id);
    expect(updated.assigneeId).toBe(arjun.id);
  });

  it("manager cannot change roles; the last owner is protected", async () => {
    const db = await seededDb();
    const priya = await staff("priya@safarscape.test");
    const owner = await staff("owner@safarscape.test");
    await expect(changeRole(db, priya, priya.id, "owner")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(changeRole(db, owner, owner.id, "manager")).rejects.toThrow(/at least one owner/);
    await expect(setActive(db, owner, owner.id, false)).rejects.toThrow(/yourself/);
  });

  it("deactivating a teammate returns their open leads to the queue and ends sessions", async () => {
    const db = await seededDb();
    const owner = await staff("owner@safarscape.test");
    const neha = await staff("neha@safarscape.test");
    const { token } = await createSession(db, neha.id, true);
    await setActive(db, owner, neha.id, false);
    expect(await userForToken(db, token)).toBeNull();
    const open = (await db.select().from(enquiries).where(eq(enquiries.assigneeId, neha.id))).filter((e) =>
      ["new", "contacted", "quoted"].includes(e.status),
    );
    expect(open).toHaveLength(0);
    await setActive(db, owner, neha.id, true);
  });
});
