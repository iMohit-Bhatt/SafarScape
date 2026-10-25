/** Builds a wa.me link with a URL-encoded, prefilled message. Returns null when no number is configured. */
export function whatsappLink(number: string | null | undefined, message: string): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Replaces {{token}} placeholders. Unknown tokens become empty strings. */
export function fillTemplate(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
      const v = vars[key];
      return v == null ? "" : String(v);
    })
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
