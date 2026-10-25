import type { LeadFilters } from "@/lib/leads";
import type { LeadStatus } from "@/db/schema";

const STATUSES = ["new", "contacted", "quoted", "converted", "lost"];
export function parseLeadFilters(sp: Record<string, string | string[] | undefined>): LeadFilters {
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const list = (k: string) => (one(k) ?? "").split(",").filter(Boolean);
  const tab = one("tab");
  const assignee = one("assignee");
  const sort = one("sort");
  return {
    tab: tab === "new" || tab === "mine" || tab === "followups" || tab === "unassigned" ? tab : "all",
    q: one("q")?.slice(0, 80) || undefined,
    status: list("status").filter((s) => STATUSES.includes(s)) as LeadStatus[],
    assignee: assignee === "none" ? "none" : assignee ? Number(assignee) || undefined : undefined,
    source: list("source"),
    days: Number(one("days")) || undefined,
    sort: sort === "oldest" || sort === "followup" ? sort : "newest",
    page: Math.max(1, Number(one("page")) || 1),
  };
}
