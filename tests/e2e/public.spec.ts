import { test, expect } from "@playwright/test";

test.describe("public site", () => {
  test("homepage renders the design sections and links into the catalogue", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Safarscape/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Trips planned by people who pick up the phone.");
    await expect(page.getByRole("heading", { name: "Trips our advisors keep recommending" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Who's coming along?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Where we'd send our own families" })).toBeVisible();
    await expect(page.getByText("EARLY-BIRD · ₹4,000 OFF", { exact: false }).first()).toBeVisible();
    await page.getByRole("link", { name: /Honeymoon/ }).first().click();
    await expect(page).toHaveURL(/\/packages\?type=honeymoon/);
    await expect(page.getByTestId("result-count")).toContainText(/^4 of \d+ packages/);
  });

  test("home search goes to filtered packages", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Kashmir, Kerala, Bali…").fill("kerala");
    await page.getByRole("button", { name: "Find trips" }).click();
    await expect(page).toHaveURL(/\/packages\?q=kerala/);
    await expect(page.getByTestId("package-grid").getByRole("article")).toHaveCount(2);
  });

  test("listing filters, chips, sort and clear all work", async ({ page }) => {
    await page.goto("/packages");
    const total = Number((await page.getByTestId("result-count").innerText()).match(/of (\d+)/)![1]);
    expect(total).toBeGreaterThanOrEqual(12);
    await page.getByRole("checkbox", { name: /Kashmir/ }).click();
    await expect(page).toHaveURL(/dest=kashmir/);
    await expect(page.getByTestId("result-count")).toContainText(`3 of ${total}`);
    await page.getByRole("button", { name: "Honeymoon", exact: true }).click();
    await expect(page.getByTestId("result-count")).toContainText(`1 of ${total}`);
    await expect(page.getByRole("button", { name: "Remove filter Kashmir" })).toBeVisible();
    await page.getByRole("button", { name: "Clear all" }).click();
    await expect(page.getByTestId("result-count")).toContainText(`${total} of ${total}`);

    await page.getByRole("radio", { name: "8 nights or more" }).click();
    await expect(page).toHaveURL(/dur=long/);
    await expect(page.getByTestId("package-grid").getByRole("article")).toHaveCount(1);
    await page.goto("/packages?sort=price-asc");
    const prices = await page.getByTestId("package-grid").locator("article p:has-text('from')").allInnerTexts();
    const nums = prices.map((p) => Number(p.replace(/from ₹|,|\s.*$/g, "").split("₹")[0]));
    expect(nums).toEqual([...nums].sort((a, b) => a - b));
  });

  test("pagination and no-results state", async ({ page }) => {
    await page.goto("/packages");
    await page.getByRole("link", { name: "Next →" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/Showing 10–\d+ of \d+/)).toBeVisible();
    await page.goto("/packages?q=antarctica");
    await expect(page.getByRole("heading", { name: "Nothing fits all of that — yet." })).toBeVisible();
  });

  test("package detail page has itinerary, departures, price and SEO data", async ({ page }) => {
    await page.goto("/packages/kashmir-5n6d");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Gulmarg snow, Dal Lake mornings");
    await expect(page).toHaveTitle(/Gulmarg snow, Dal Lake mornings/);
    await expect(page.getByRole("heading", { name: "Day by day" })).toBeVisible();
    await expect(page.locator("ol li h3")).toHaveCount(6);
    await expect(page.getByText("14 – 19 Jan 2027", { exact: true })).toBeVisible();
    await expect(page.getByText("Only 2 seats left")).toBeVisible();
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.some((t) => t.includes('"TouristTrip"') && t.includes('"priceCurrency":"INR"'))).toBe(true);
    expect(ld.some((t) => t.includes('"FAQPage"'))).toBe(true);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/packages\/kashmir-5n6d$/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /Gulmarg/);
  });

  test("photo viewer opens and pages with the keyboard", async ({ page }) => {
    await page.goto("/packages/kashmir-5n6d");
    await page.getByRole("button", { name: /View all 3 photos/ }).click();
    const viewer = page.getByRole("dialog", { name: "Photo viewer" });
    await expect(viewer).toContainText("1 / 3");
    await page.keyboard.press("ArrowRight");
    await expect(viewer).toContainText("2 / 3");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(viewer).toContainText("3 / 3");
    await page.keyboard.press("Escape");
    await expect(viewer).toBeHidden();
  });

  test("destination, guides, about, reviews, gallery, contact and legal pages render", async ({ page }) => {
    for (const [path, h1] of [
      ["/destinations", "Places we know well"],
      ["/destinations/kashmir", "Kashmir"],
      ["/guides", "Notes from the road"],
      ["/guides/inner-line-permits-ladakh", "Inner Line Permits for Ladakh: what you actually need"],
      ["/about", "A small agency that still answers the phone."],
      ["/reviews", "In their words"],
      ["/gallery", "From the road"],
      ["/contact", "Talk to a person"],
      ["/privacy", "Privacy policy"],
      ["/terms", "Terms of use"],
      ["/custom-trip", "Plan a trip with us"],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }), path).toHaveText(h1);
      await expect(page.locator("h1"), `${path} has one h1`).toHaveCount(1);
    }
    await page.goto("/reviews");
    await expect(page.getByText(/Sample content/)).toBeVisible();
  });

  test("search, 404, unpublished drafts, sitemap and robots", async ({ page, request }) => {
    await page.goto("/search?q=houseboat");
    await expect(page.getByText(/results? for “houseboat”/)).toBeVisible();
    const missing = await page.goto("/packages/kashmir-autumn-chinar-5n");
    expect(missing?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "This road doesn't go anywhere." })).toBeVisible();
    expect((await page.goto("/totally/unknown"))?.status()).toBe(404);

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/packages/kashmir-5n6d");
    expect(sitemap).not.toContain("kashmir-autumn-chinar-5n");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Sitemap:");
  });

  test("contact details and phone link come from settings", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByRole("link", { name: "+91 11400 00000", exact: true })).toHaveAttribute("href", "tel:+911140000000");
  });

  test("cookie consent gates analytics", async ({ page }) => {
    await page.goto("/");
    // No GA/Pixel IDs configured in tests → no banner, no third-party scripts.
    await expect(page.getByRole("region", { name: "Cookie preferences" })).toHaveCount(0);
    expect(await page.locator('script[src*="googletagmanager"]').count()).toBe(0);
  });
});
