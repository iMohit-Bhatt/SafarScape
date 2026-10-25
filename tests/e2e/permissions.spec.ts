import { test, expect } from "@playwright/test";
import { login, staff } from "./helpers";

test.describe("role permissions", () => {
  test("sales cannot reach owner/manager areas, export, or publish", async ({ page }) => {
    await login(page, staff.sales);
    // Sidebar hides what the role can't use.
    await expect(page.getByRole("link", { name: "Reports" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Team & roles" })).toHaveCount(0);

    for (const path of ["/admin/reports", "/admin/settings/team", "/admin/settings/agency", "/admin/content/blog", "/admin/packages/new"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/admin\/denied/);
      await expect(page.getByRole("heading", { name: "You don't have access to this page" })).toBeVisible();
    }

    const csv = await page.request.get("/admin/leads/export");
    expect(csv.status()).toBe(403);

    await page.goto("/admin/leads");
    await expect(page.getByRole("link", { name: "Export CSV" })).toHaveCount(0);
    // Only own + unassigned leads are listed.
    await expect(page.locator("tbody")).not.toContainText("Demo lead · Meera J."); // assigned to Neha

    await page.goto("/admin/packages/1");
    await expect(page.getByText("Your role can view packages but not change them.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Unpublish" })).toHaveCount(0);
  });

  test("manager cannot manage the team; owner can", async ({ page }) => {
    await login(page, staff.manager);
    await page.goto("/admin/settings/team");
    await expect(page).toHaveURL(/\/admin\/denied/);
    await page.getByRole("button", { name: "Sign out" }).first().click();

    await login(page, staff.owner);
    await page.goto("/admin/settings/team");
    await expect(page.getByRole("heading", { name: "Team & roles" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What each role can do" })).toBeVisible();
  });

  test("unauthenticated requests are redirected or refused", async ({ page, request }) => {
    await page.goto("/admin/settings/email");
    await expect(page).toHaveURL(/\/admin\/login/);
    const r = await request.get("/admin/leads/export", { maxRedirects: 0 });
    expect([302, 307, 401]).toContain(r.status());
  });
});
