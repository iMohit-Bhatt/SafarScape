import { test, expect } from "@playwright/test";
import { uniquePhone } from "./helpers";

test.describe("mobile", () => {
  test("menu drawer opens and navigates", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: /Destinations/ }).click();
    await expect(page).toHaveURL(/\/destinations$/);
    await expect(menu).toBeHidden();
  });

  test("filters open in a sheet on the packages page", async ({ page }) => {
    await page.goto("/packages");
    await page.getByRole("button", { name: /^Filters/ }).click();
    const sheet = page.getByRole("dialog", { name: "Filters" });
    await sheet.getByRole("button", { name: "Family", exact: true }).click();
    await sheet.getByRole("button", { name: "Show results" }).click();
    await expect(page).toHaveURL(/type=family/);
  });

  test("sticky enquire bar opens the enquiry sheet and submits", async ({ page }) => {
    await page.goto("/packages/kerala-tea-hills-backwaters-6n");
    await page.getByRole("button", { name: "Enquire", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: /we'll call you back/ });
    await sheet.getByLabel("Your name").fill("Divya Nair");
    await sheet.getByLabel("Mobile number").fill(uniquePhone());
    await sheet.getByRole("checkbox").check();
    await sheet.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page).toHaveURL(/\/enquiry\/received$/);
  });

  test("no horizontal scrolling on key pages", async ({ page }) => {
    for (const path of ["/", "/packages", "/packages/kashmir-5n6d", "/destinations/kashmir", "/custom-trip", "/contact"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(1);
    }
  });
});
