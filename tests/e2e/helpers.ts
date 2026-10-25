import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "Safarscape#2026";
export const staff = {
  owner: "owner@safarscape.test",
  manager: "priya@safarscape.test",
  sales: "arjun@safarscape.test",
};

export async function login(page: Page, email: string, password = DEMO_PASSWORD) {
  await page.goto("/admin/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Unique Indian mobile per test run so duplicate protection doesn't merge leads. */
export function uniquePhone() {
  return `9${String(Date.now()).slice(-9)}`;
}
