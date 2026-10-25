import { z } from "zod";
import { normalisePhone } from "./phone";

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : undefined));

export const enquiryKinds = ["package", "destination", "custom", "contact"] as const;

export const enquirySchema = z
  .object({
    kind: z.enum(enquiryKinds).default("package"),
    name: trimmed(80).min(2, "Please tell us your name."),
    countryCode: z.string().trim().regex(/^\+\d{1,4}$/).default("+91"),
    phone: z
      .string()
      .trim()
      .min(1, "We need a number to call you back.")
      .refine((v) => {
        const d = v.replace(/\D/g, "").length;
        return d >= 8 && d <= 15;
      }, "Enter a valid mobile number, e.g. 98110 45672."),
    email: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((v) => (v ? v.toLowerCase() : undefined))
      .pipe(z.email("That email doesn't look right.").optional()),
    travelMonth: optionalText(60),
    departureId: z.coerce.number().int().positive().optional().catch(undefined),
    departureCity: optionalText(60),
    adults: z.coerce.number().int().min(1, "At least one adult.").max(40, "For groups over 40, call us.").default(2),
    children: z.coerce.number().int().min(0).max(20).default(0),
    budget: optionalText(40),
    message: optionalText(2000),
    packageSlug: optionalText(120),
    destinationSlug: optionalText(120),
    details: z.record(z.string(), z.unknown()).optional(),
    consent: z
      .union([z.boolean(), z.literal("on"), z.literal("true")])
      .optional()
      .transform((v) => v === true || v === "on" || v === "true")
      .refine((v) => v, "Please tick this so we can contact you."),
    // Spam: honeypot must stay empty; Turnstile token is checked separately.
    website: z.string().max(0).optional().default(""),
    turnstileToken: z.string().optional(),
    utm: z.record(z.string(), z.string().max(200)).optional(),
    referrer: optionalText(500),
    pageUrl: optionalText(500),
  })
  .transform((v, ctx) => {
    const phone = normalisePhone(v.phone, v.countryCode);
    if (!phone) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Enter a valid mobile number, e.g. 98110 45672." });
      return z.NEVER;
    }
    return { ...v, phone };
  });

export type EnquiryInput = z.input<typeof enquirySchema>;
export type EnquiryData = z.output<typeof enquirySchema>;

export type FieldErrors = Record<string, string>;
export function fieldErrors(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
