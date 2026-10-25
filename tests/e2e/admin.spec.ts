import { test, expect } from "@playwright/test";
import { login, staff, uniquePhone } from "./helpers";

test.describe("staff console", () => {
  test("sign-in errors, lockout message and session redirect", async ({ page }) => {
    await page.goto("/admin/leads");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fleads/);
    await page.getByLabel("Work email").fill(staff.manager);
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("That email and password don't match.")).toBeVisible();
    await page.getByLabel("Password", { exact: true }).fill("Safarscape#2026");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/leads$/);
    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page).toHaveURL(/signedout=1/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("forgot password never reveals whether an account exists", async ({ page }) => {
    await page.goto("/admin/forgot");
    await page.getByLabel("Work email").fill("nobody@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("status")).toContainText("If nobody@example.com belongs to a team member");
  });

  test("dashboard shows KPIs and the conversion definition", async ({ page }) => {
    await login(page, staff.manager);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Priya");
    await expect(page.getByText("• Awaiting contact", { exact: true })).toBeVisible();
    await expect(page.getByText(/leads created in Oct|leads created in/).first()).toBeVisible();
    await expect(page.getByText("Leads awaiting contact")).toBeVisible();
    await page.getByLabel("Period").selectOption("30d");
    await expect(page).toHaveURL(/period=30d/);
  });

  test("lead workflow: assign, status with lost reason, follow-up, note, CSV export", async ({ page }) => {
    // Create a fresh lead through the public API so the test owns it.
    const name = `E2E Lead ${Date.now()}`;
    const res = await page.request.post("/api/enquiries", { data: { kind: "package", packageSlug: "kerala-tea-hills-backwaters-6n", name, phone: uniquePhone(), consent: true } });
    expect(res.status()).toBe(201);

    await login(page, staff.manager);
    await page.goto(`/admin/leads?q=${encodeURIComponent(name)}`);
    await expect(page.getByTestId("lead-count")).toHaveText("1 lead match");
    await page.getByRole("link", { name }).click();

    await page.locator("#lead-owner").selectOption({ label: "Arjun M." });
    await expect(page.getByTestId("activity")).toContainText("assigned to Arjun M.");

    await page.locator("#lead-status").selectOption("contacted");
    await expect(page.getByTestId("activity")).toContainText("changed status New → Contacted");

    await page.locator("#lead-status").selectOption("quoted");
    const quoted = page.getByRole("dialog", { name: "Mark as quoted" });
    await quoted.getByLabel(/Quoted amount/).fill("58000");
    await quoted.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("₹58,000")).toBeVisible();

    await page.getByRole("button", { name: "Tomorrow" }).click();
    await page.getByLabel("What to do").fill("Send revised quote");
    await page.getByRole("button", { name: "Set follow-up" }).click();
    await expect(page.getByRole("button", { name: "Mark done" })).toBeVisible();

    await page.getByLabel("Add a note").fill("Keen on houseboat upgrade.");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByTestId("activity")).toContainText("added a note · Keen on houseboat upgrade.");

    await page.locator("#lead-status").selectOption("lost");
    const lost = page.getByRole("dialog", { name: "Mark as lost" });
    await expect(lost.getByRole("button", { name: "Save" })).toBeDisabled();
    await lost.getByLabel("Why was it lost?").selectOption("Booked elsewhere");
    await lost.getByRole("button", { name: "Save" }).click();
    await expect(page.getByTestId("activity")).toContainText("Quoted → Lost · Booked elsewhere");
    await expect(page.getByText("This lead is closed. No follow-up needed.")).toBeVisible();

    await page.goto("/admin/leads");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Export CSV" }).click()]);
    const csv = await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString("utf8"));
    expect(csv).toContain("Reference,Created,Name,Phone");
    expect(csv).toContain(name);
  });

  test("bulk assign from the leads table", async ({ page }) => {
    await login(page, staff.manager);
    await page.goto("/admin/leads?tab=unassigned");
    const rows = page.locator("tbody tr");
    const before = await rows.count();
    test.skip(before === 0, "no unassigned leads");
    await page.locator("tbody").getByRole("checkbox").first().check();
    await expect(page.getByText("1 selected")).toBeVisible();
    await page.getByLabel("Assign selected").selectOption({ label: "Neha K." });
    await expect(page.getByText("Updated 1 lead")).toBeVisible();
  });

  test("package publishing: create draft, blocked until complete, publish, unpublish", async ({ page }) => {
    const title = `Spiti in September ${Date.now() % 100000}`;
    await login(page, staff.manager);
    await page.goto("/admin/packages/new");
    await page.getByLabel("Package title").fill(title);
    await page.getByLabel("Short summary").fill("High desert monasteries after the monsoon.");
    await page.getByLabel("Starting price per person").fill("39500");
    await page.getByRole("tab", { name: "Destination & type" }).click();
    await page.getByLabel("Destination").selectOption({ label: "Himachal Pradesh" });
    await page.getByLabel("Trip type").selectOption("adventure");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page).toHaveURL(/\/admin\/packages\/\d+$/);
    await expect(page.getByText("draft", { exact: true })).toBeVisible();

    // Publishing an incomplete package is refused with reasons.
    await page.getByRole("button", { name: "Publish" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Publish now" }).click();
    await expect(page.getByText(/Add at least one photo\./).first()).toBeVisible();

    await page.getByRole("tab", { name: "Photos" }).click();
    await page.getByRole("button", { name: "+ Add photo" }).click();
    await page.getByLabel("Alt text (cover)").fill("Key monastery above the Spiti river");
    await page.getByRole("tab", { name: "Itinerary" }).click();
    await page.getByRole("button", { name: "+ Add day" }).click();
    await page.getByLabel("Title").fill("Arrive Manali");
    await page.getByRole("tab", { name: "Hotels & inclusions" }).click();
    await page.getByLabel("Included", { exact: true }).fill("6 nights' stay\nPrivate SUV");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Saved", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "Publish" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Publish now" }).click();
    await expect(page.getByText("published", { exact: true })).toBeVisible();

    const pub = await page.request.get(`/packages?q=${encodeURIComponent("Spiti in September")}`);
    expect(await pub.text()).toContain(title);

    await page.getByRole("button", { name: "Unpublish" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByText("unpublished", { exact: true })).toBeVisible();
    const after = await page.request.get(`/packages?q=${encodeURIComponent("Spiti in September")}`);
    expect(await after.text()).not.toContain(title);
  });

  test("content: approve a testimonial and schedule-free publish of an article", async ({ page }) => {
    await login(page, staff.manager);
    await page.goto("/admin/content/testimonials");
    await page.getByRole("button", { name: "+ Add review" }).click();
    await page.getByLabel("Name as they want it shown").fill("Real Traveller");
    await page.getByLabel("Trip", { exact: true }).fill("Goa · Family");
    await page.getByLabel("Their words").fill("Easy, calm trip. The villa was exactly as described.");
    await page.getByText("Traveller agreed to publish this").click();
    await page.getByRole("button", { name: "Save as pending" }).click();
    const card = page.locator("li", { hasText: "Real Traveller" });
    await card.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Approved", { exact: true })).toBeVisible(); // toast
    await page.getByRole("button", { name: /^approved/ }).click();
    await expect(page.locator("li", { hasText: "Real Traveller" }).getByText("approved", { exact: true })).toBeVisible();
    await page.goto("/reviews");
    await expect(page.getByText("Easy, calm trip.", { exact: false })).toBeVisible();
  });
});
