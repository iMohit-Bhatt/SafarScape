import { test, expect } from "@playwright/test";
import { login, staff, uniquePhone } from "./helpers";

test.describe("lead capture", () => {
  test("package enquiry: validation → submit → confirmation → appears in the CRM with email logged", async ({ page }) => {
    await page.goto("/packages/kashmir-5n6d?utm_source=instagram&utm_campaign=kashmir_winter");
    await page.getByRole("button", { name: "Enquire about this trip" }).click();
    const dialog = page.getByRole("dialog", { name: "Tell us a little, we'll call you back" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Preferred departure or month")).toHaveValue(/\d+/); // first open departure preselected

    // Client-side validation
    await dialog.getByRole("button", { name: "Send enquiry" }).click();
    await expect(dialog.getByText("Please tell us your name.")).toBeVisible();
    await expect(dialog.getByText("We need a number to call you back.")).toBeVisible();
    await expect(dialog.getByText("Please tick this so we can contact you.")).toBeVisible();

    const phone = uniquePhone();
    await dialog.getByLabel("Your name").fill("Ananya Rao");
    await dialog.getByLabel("Mobile number").fill("12345");
    await dialog.getByRole("button", { name: "Send enquiry" }).click();
    await expect(dialog.getByText(/Enter a valid mobile number/)).toBeVisible();

    await dialog.getByLabel("Mobile number").fill(phone);
    await dialog.getByRole("textbox", { name: "Email" }).fill("ananya.rao@example.com");
    await dialog.getByLabel("Travelling from").fill("Bengaluru");
    await dialog.getByRole("button", { name: "More children" }).click();
    await dialog.getByLabel("Budget per person").selectOption("₹30k – ₹45k");
    await dialog.getByLabel(/Anything we should know/).fill("Anniversary trip, first time in snow.");
    await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: "Send enquiry" }).click();

    await expect(page).toHaveURL(/\/enquiry\/received$/);
    await expect(page.getByTestId("received-heading")).toHaveText("We've got your enquiry, Ananya.");
    const reference = (await page.getByTestId("reference").innerText()).trim();
    expect(reference).toMatch(/^SFS-\d{5}$/);
    await expect(page.getByText("A copy is on its way to ananya.rao@example.com", { exact: false })).toBeVisible();
    await expect(page.getByText("14 – 19 Jan 2027", { exact: true })).toBeVisible();
    const events = await page.evaluate(() => window.__sfsEvents ?? []);
    expect(events.some((e) => e.name === "generate_lead" && e.params.reference === reference)).toBe(true);

    // Staff see it, with source attribution and both emails in the log.
    await login(page, staff.manager);
    await page.goto(`/admin/leads?q=${reference}`);
    await page.getByRole("link", { name: "Ananya Rao" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ananya Rao");
    await expect(page.getByText("Bengaluru")).toBeVisible();
    await expect(page.getByText("kashmir_winter", { exact: true })).toBeVisible();
    await expect(page.locator("#lead-status")).toHaveValue("new");
    await page.getByRole("tab", { name: /Emails · 2/ }).click();
    await expect(page.getByText(`New enquiry ${reference}`, { exact: false })).toBeVisible();
    await expect(page.getByText(`We've got your enquiry — ${reference}`)).toBeVisible();
  });

  test("custom trip form submits and keeps a draft on the device", async ({ page }) => {
    await page.goto("/custom-trip");
    await page.getByLabel("Your name").fill("Kabir Menon");
    await page.getByLabel("Mobile number").fill(uniquePhone());
    await page.getByRole("button", { name: "Kerala", exact: true }).click();
    await page.getByRole("button", { name: "Andaman Islands", exact: true }).click();
    await page.getByRole("button", { name: "More children" }).click();
    await page.getByLabel("Child 1 age").selectOption("9");
    await page.getByRole("button", { name: "Comfortable 4-star" }).click();
    await page.getByRole("button", { name: "Beaches" }).click();
    await expect(page.getByLabel("Your trip so far")).toContainText("Kerala & Andaman Islands");
    await page.reload();
    await expect(page.getByLabel("Your name")).toHaveValue("Kabir Menon"); // draft restored
    await page.getByRole("button", { name: "Send my trip request" }).click();
    await expect(page.getByText("Please tick this so we can contact you.")).toBeVisible();
    await page.getByRole("checkbox", { name: /happy for Safarscape/ }).check();
    await page.getByRole("button", { name: "Send my trip request" }).click();
    await expect(page).toHaveURL(/\/enquiry\/received$/);
    await expect(page.getByTestId("received-heading")).toContainText("Kabir");
  });

  test("destination callback and contact form", async ({ page }) => {
    await page.goto("/destinations/kerala");
    await page.getByPlaceholder("Full name").fill("Meera Iyer");
    await page.getByPlaceholder("+91 98XXX XXXXX").fill(uniquePhone());
    await page.getByRole("checkbox", { name: /Call or WhatsApp me/ }).check();
    await page.getByRole("button", { name: "Request a callback" }).click();
    await expect(page).toHaveURL(/\/enquiry\/received$/);

    await page.goto("/contact");
    await page.getByLabel("Your name").fill("Rahul Desai");
    await page.getByRole("textbox", { name: "Phone" }).fill(uniquePhone());
    await page.getByLabel("Message").fill("Group of 12 for a Rajasthan trip in February.");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Request a callback" }).click();
    await expect(page.getByRole("status")).toContainText("Thanks, Rahul");
    await expect(page.getByTestId("reference")).toHaveText(/SFS-\d{5}/);
  });

  test("API validates on the server and never leaks internals", async ({ request }) => {
    const bad = await request.post("/api/enquiries", { data: { name: "A", phone: "1", consent: false } });
    expect(bad.status()).toBe(422);
    const body = await bad.json();
    expect(body.fieldErrors).toMatchObject({ name: expect.any(String), phone: expect.any(String), consent: expect.any(String) });

    const junk = await request.post("/api/enquiries", { data: Buffer.from("{not json"), headers: { "content-type": "application/json" } });
    expect(junk.status()).toBe(400);
    expect(JSON.stringify(await junk.json())).not.toMatch(/stack|Error:|at /);

    // International number is accepted and normalised.
    const ok = await request.post("/api/enquiries", {
      data: { kind: "contact", name: "Tom Hughes", countryCode: "+44", phone: "7700 900123", consent: true },
    });
    expect(ok.status()).toBe(201);
    expect((await ok.json()).reference).toMatch(/^SFS-/);
  });
});
