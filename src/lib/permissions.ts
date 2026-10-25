import type { Role } from "@/db/schema";

/**
 * Capability matrix (mirrors Settings → Roles in the design).
 * Checked on the server for every admin action — the UI only hides what a role can't do.
 */
export const capabilities = {
  "leads.view": ["owner", "manager", "sales"],
  "leads.viewAll": ["owner", "manager"],
  "leads.edit": ["owner", "manager", "sales"],
  "leads.assign": ["owner", "manager"],
  "leads.export": ["owner", "manager"],
  "leads.delete": ["owner"],
  "catalogue.edit": ["owner", "manager"],
  "catalogue.publish": ["owner", "manager"],
  "content.edit": ["owner", "manager"],
  "testimonials.approve": ["owner", "manager"],
  "reports.view": ["owner", "manager"],
  "settings.team": ["owner"],
  "settings.email": ["owner", "manager"],
  "settings.agency": ["owner"],
} as const satisfies Record<string, readonly Role[]>;

export type Capability = keyof typeof capabilities;

export function can(role: Role | null | undefined, cap: Capability): boolean {
  if (!role) return false;
  return (capabilities[cap] as readonly Role[]).includes(role);
}

export class ForbiddenError extends Error {
  constructor(public capability: string) {
    super("You don't have permission to do that.");
    this.name = "ForbiddenError";
  }
}

export const roleLabels: Record<Role, string> = { owner: "Owner", manager: "Manager", sales: "Sales" };
export const roleDescriptions: Record<Role, string> = {
  owner: "Everything, including team, roles and agency settings.",
  manager: "Leads for everyone, catalogue, content, reports and email routing.",
  sales: "Their own leads and unassigned leads. Read-only catalogue.",
};
