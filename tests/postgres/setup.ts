import { vi } from "vitest";

if (!process.env.TEST_POSTGRES_URL) throw new Error("Set TEST_POSTGRES_URL to a disposable Postgres database.");
process.env.DATABASE_URL = process.env.TEST_POSTGRES_URL;
process.env.SEED_ON_START = "false";
process.env.EMAIL_PROVIDER = "outbox";
process.env.ENQUIRY_RATE_LIMIT = "1000";
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
