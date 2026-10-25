import { eq } from "drizzle-orm";
import type { DB } from "@/db";
import { settings } from "@/db/schema";
import { defaultSettings } from "@/db/seed-data";

export type Settings = typeof defaultSettings;
export type SettingKey = keyof Settings;

export async function getSettings(db: DB): Promise<Settings> {
  const rows = await db.select().from(settings);
  const out = structuredClone(defaultSettings) as Settings;
  for (const r of rows) {
    if (r.key in out) (out as Record<string, unknown>)[r.key] = r.value;
  }
  // Environment overrides for contact numbers (useful before the owner fills admin).
  if (!out.agency.whatsapp && process.env.NEXT_PUBLIC_WHATSAPP_NUMBER) out.agency.whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (!out.agency.phone && process.env.AGENCY_PHONE) out.agency.phone = process.env.AGENCY_PHONE;
  return out;
}

export async function setSetting<K extends SettingKey>(db: DB, key: K, value: Settings[K]) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

export async function getSetting<K extends SettingKey>(db: DB, key: K): Promise<Settings[K]> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return (row?.value as Settings[K]) ?? defaultSettings[key];
}
