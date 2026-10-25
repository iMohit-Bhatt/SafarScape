import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3200);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

// In sandboxes without the Playwright browser download, point PW_CHROMIUM_PATH at any Chromium build.
const launchOptions = process.env.PW_CHROMIUM_PATH
  ? { executablePath: process.env.PW_CHROMIUM_PATH, args: ["--no-sandbox", "--no-zygote", "--disable-setuid-sandbox", "--use-gl=angle", "--use-angle=swiftshader"] }
  : {};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure", launchOptions },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, launchOptions }, testIgnore: /mobile\.spec/ },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions }, testMatch: /mobile\.spec/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // Fresh in-memory Postgres per run, seeded with demo data; email goes to the outbox.
        command: `npx next start -p ${PORT}`,
        url: `${baseURL}/`,
        timeout: 120_000,
        reuseExistingServer: false,
        env: {
          DATABASE_URL: "pglite://memory",
          EMAIL_PROVIDER: "outbox",
          ENQUIRY_RATE_LIMIT: "1000",
          NEXT_PUBLIC_SITE_URL: baseURL,
          AGENCY_PHONE: "+911140000000",
        },
      },
});
