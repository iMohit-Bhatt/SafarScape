import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { seededDb } from "../helpers/db";
import { users, enquiries, leadActivities } from "@/db/schema";
import { changeStatus, assignLead, setFollowUp, addActivity, exportLeadsCsv, listLeads, createManualLead, tabCounts, LeadError } from "@/lib/leads";

const get = async (email: string) => {
  const db = await seededDb();
  return (await db.select().from(users).where(eq(users.email, email)))[0];
};

describe("lead workflow", () => {
  it("moves a lead through statuses, logging each change", async () => {
    const db = await seededDb();
    const priya = await get("priya@safarscape.test");
    const lead = await createManualLead(db, priya, { name: "Walk-in Test", phone: "9876501234", source: "phone" });
    expect(lead.status).toBe("new");
    const contacted = await changeStatus(db, priya, lead.id, "contacted");
    expect(contacted.firstContactAt).not.toBeNull();
    const quoted = await changeStatus(db, priya, lead.id, "quoted", { quotedAmount: 72000 });
    expect(quoted.quotedAmount).toBe(72000);
    await changeStatus(db, priya, lead.id, "converted");
    const acts = await db.select().from(leadActivities).where(eq(leadActivities.enquiryId, lead.id));
    expect(acts.filter((a) => a.kind === "status").map((a) => a.body)).toEqual([
      "changed status New → Contacted",
      "changed status Contacted → Quoted",
      "changed status Quoted → Converted",
    ]);
  });

  it("requires a reason to mark a lead lost and clears follow-ups", async () => {
    const db = await seededDb();
    const priya = await get("priya@safarscape.test");
    const lead = await createManualLead(db, priya, { name: "Lost Test", phone: "9876501235" });
    await setFollowUp(db, priya, lead.id, new Date(Date.now() + 3600_000), "Call back");
    await expect(changeStatus(db, priya, lead.id, "lost")).rejects.toBeInstanceOf(LeadError);
    const lost = await changeStatus(db, priya, lead.id, "lost", { lostReason: "Booked elsewhere" });
    expect(lost.lostReason).toBe("Booked elsewhere");
    expect(lost.followUpAt).toBeNull();
  });

  it("assigns, sets follow-ups and records notes", async () => {
    const db = await seededDb();
    const priya = await get("priya@safarscape.test");
    const arjun = await get("arjun@safarscape.test");
    const lead = await createManualLead(db, priya, { name: "Assign Test", phone: "9876501236" });
    expect((await assignLead(db, priya, lead.id, arjun.id)).assigneeId).toBe(arjun.id);
    const at = new Date(Date.now() - 60_000);
    await setFollowUp(db, arjun, lead.id, at, "Send revised quote");
    const due = await listLeads(db, arjun, { tab: "followups", pageSize: 100 });
    expect(due.rows.some((r) => r.lead.id === lead.id)).toBe(true);
    await addActivity(db, arjun, lead.id, "call", "Connected, 6 min");
    await expect(addActivity(db, arjun, lead.id, "note", "   ")).rejects.toThrow();
    const [after] = await db.select().from(enquiries).where(eq(enquiries.id, lead.id));
    expect(after.firstContactAt).not.toBeNull();
    const counts = await tabCounts(db, arjun);
    expect(counts.mine).toBeGreaterThan(0);
  });

  it("filters and searches", async () => {
    const db = await seededDb();
    const priya = await get("priya@safarscape.test");
    const byStatus = await listLeads(db, priya, { status: ["quoted"], pageSize: 100 });
    expect(byStatus.rows.every((r) => r.lead.status === "quoted")).toBe(true);
    const byPhone = await listLeads(db, priya, { q: "98000 00003" });
    expect(byPhone.rows).toHaveLength(1);
    expect(byPhone.rows[0].lead.name).toContain("Meera");
  });

  it("exports CSV safely (no formula injection)", async () => {
    const db = await seededDb();
    const priya = await get("priya@safarscape.test");
    await createManualLead(db, priya, { name: "=HYPERLINK(\"x\")", phone: "9876501237" });
    const csv = await exportLeadsCsv(db, priya);
    expect(csv.split("\n")[0]).toMatch(/^Reference,Created,Name,Phone/);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
