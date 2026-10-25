import { vi } from "vitest";

process.env.DATABASE_URL = "pglite://memory";
process.env.SEED_ON_START = "false";
process.env.EMAIL_PROVIDER = "outbox";
process.env.SESSION_SECRET ??= "test-secret-test-secret-test-secret";

// next/headers and next/cache are only available inside a Next request; tests use these stand-ins.
const cookieJar = new Map<string, string>();
(globalThis as Record<string, unknown>).__testCookies = cookieJar;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
    set: (name: string, value: string) => void cookieJar.set(name, value),
    delete: (name: string) => void cookieJar.delete(name),
  }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7", "user-agent": "vitest" }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  updateTag: () => {},
  refresh: () => {},
}));
