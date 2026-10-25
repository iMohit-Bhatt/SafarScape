/**
 * Normalises a phone number to E.164.
 * - Indian mobiles typed as 10 digits (optionally with 0 or 91 prefix) become +91XXXXXXXXXX.
 * - Numbers with an explicit + country code are kept (international travellers).
 * Returns null when the number can't be valid.
 */
export function normalisePhone(raw: string, defaultCountry = "+91"): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+") || trimmed.startsWith("00");
  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("00")) digits = digits.slice(2);

  if (hasPlus) {
    if (digits.startsWith("91")) return validIndian(digits.slice(2));
    // International: E.164 allows 8–15 digits including country code.
    if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) return null;
    return `+${digits}`;
  }

  if (defaultCountry === "+91") {
    if (digits.length === 12 && digits.startsWith("91")) return validIndian(digits.slice(2));
    if (digits.length === 11 && digits.startsWith("0")) return validIndian(digits.slice(1));
    if (digits.length === 10) return validIndian(digits);
    return null;
  }
  const cc = defaultCountry.replace(/\D/g, "");
  if (digits.length < 6 || digits.length + cc.length > 15) return null;
  return `+${cc}${digits.replace(/^0+/, "")}`;
}

function validIndian(ten: string): string | null {
  // Indian mobile numbers are 10 digits starting 6–9.
  return /^[6-9]\d{9}$/.test(ten) ? `+91${ten}` : null;
}
