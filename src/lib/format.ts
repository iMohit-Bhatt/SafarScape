export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
export function formatINR(n: number | null | undefined): string {
  if (n == null) return "—";
  return `₹${inr.format(n)}`;
}
export function formatINRShort(n: number): string {
  if (n >= 100000) return `₹${+(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${Math.round(n / 1000)}k`;
  return `₹${n}`;
}

export const durationLabel = (nights: number) => `${nights}N/${nights + 1}D`;

/** "2027-01-14","2027-01-19" → "14 – 19 Jan 2027" */
export function formatDateRange(start: string, end: string): string {
  const a = new Date(`${start}T00:00:00Z`);
  const b = new Date(`${end}T00:00:00Z`);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
  const right = `${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
  return sameMonth ? `${a.getUTCDate()} – ${right}` : `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]} – ${right}`;
}

export function formatDate(d: Date | string | null | undefined, withTime = false): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" };
  if (withTime) Object.assign(opts, { hour: "numeric", minute: "2-digit" });
  return new Intl.DateTimeFormat("en-IN", opts).format(date);
}

export function timeAgo(d: Date | string, now = new Date()): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const s = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

export function monthRangeLabel(months: number[]): string {
  if (!months.length) return "Any month";
  const sorted = [...months];
  return sorted.length <= 3 ? sorted.map((m) => MONTHS[m - 1]).join(", ") : `${MONTHS[sorted[0] - 1]} – ${MONTHS[sorted.at(-1)! - 1]}`;
}

export function initials(name: string): string {
  return name
    .replace(/^Demo lead · /, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function maskPhone(p: string): string {
  const digits = p.replace(/[^\d+]/g, "");
  if (digits.length < 6) return p;
  return `${digits.slice(0, digits.length - 8)} ${digits.slice(-10, -5)} •••${digits.slice(-2)}`.trim();
}

export function displayPhone(p: string): string {
  const m = p.match(/^\+91(\d{5})(\d{5})$/);
  return m ? `+91 ${m[1]} ${m[2]}` : p;
}
