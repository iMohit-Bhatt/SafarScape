"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { postEnquiry, rememberEnquiry } from "./enquiry-client";
import { Turnstile } from "./form-parts";
import { WhatsAppIcon } from "@/components/ui/icons";
import { btn } from "@/components/ui/buttons";

const lineInput =
  "w-full border-0 border-b border-[#4F7177] bg-transparent pb-3 pt-1 text-[17px] text-ivory placeholder:text-[#7D9A99] outline-none focus:border-gold";
const lineLabel = "text-[12px] tracking-[0.12em] uppercase text-[#9FB5B3]";

/** Short "request a callback" form on teal panels (home, destination pages). */
export function QuickCallbackForm({
  destinationSlug,
  destinationName,
  whatsappHref,
  variant = "custom",
}: {
  destinationSlug?: string;
  destinationName?: string;
  whatsappHref: string | null;
  variant?: "custom" | "destination";
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [where, setWhere] = useState(destinationName ?? "");
  const [second, setSecond] = useState(variant === "destination" ? "" : "2 adults");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const onToken = useCallback((t: string) => setToken(t), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fe: Record<string, string> = {};
    if (name.trim().length < 2) fe.name = "Please tell us your name.";
    if (phone.replace(/\D/g, "").length < 8) fe.phone = "Enter a valid mobile number.";
    if (!consent) fe.consent = "Please tick this so we can call you.";
    setErrors(fe);
    if (Object.keys(fe).length) return;
    setBusy(true);
    setError("");
    const adults = Number(second.match(/(\d+)\s*adult/)?.[1] ?? 2);
    const res = await postEnquiry({
      kind: variant === "destination" ? "destination" : "custom",
      destinationSlug,
      name,
      phone,
      adults,
      travelMonth: variant === "destination" ? second || undefined : undefined,
      message: variant === "custom" ? `Where to: ${where || "not sure yet"} · Travellers: ${second || "—"}` : undefined,
      details: variant === "custom" ? { whereTo: where, travellers: second } : undefined,
      consent,
      turnstileToken: token || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setErrors(res.fieldErrors ?? {});
      setError(res.error);
      return;
    }
    rememberEnquiry({
      reference: res.reference,
      firstName: res.firstName,
      phone,
      trip: variant === "destination" ? `${destinationName} trip` : where || "Custom trip",
      tripMeta: variant === "destination" ? destinationName : "Custom trip",
      departure: variant === "destination" ? second || "Flexible" : "To discuss",
      travellers: variant === "custom" ? second : undefined,
      destinationName: destinationName ?? where,
    });
    router.push("/enquiry/received");
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
      {variant === "destination" && (
        <div className="grid gap-3.5 sm:grid-cols-[1fr_1fr]">
          <label className="flex flex-col gap-2 py-3">
            <span className={lineLabel}>Destination</span>
            <span className="flex items-center justify-between border-b border-[#4F7177] pb-3 pt-1 text-[17px] text-ivory">
              {destinationName} <span className="text-[12px] text-[#9FB5B3]">Pre-filled</span>
            </span>
          </label>
          <label className="flex flex-col gap-2 py-3">
            <span className={lineLabel}>When</span>
            <input className={lineInput} placeholder="Month or dates" value={second} onChange={(e) => setSecond(e.target.value)} />
          </label>
        </div>
      )}
      <div className="grid gap-3.5 sm:grid-cols-2">
        <label className="flex flex-col gap-2 py-3">
          <span className={lineLabel}>Your name</span>
          <input className={lineInput} placeholder="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name || undefined} />
          {errors.name && <span role="alert" className="text-[13px] text-[#F3B8AE]">{errors.name}</span>}
        </label>
        <label className="flex flex-col gap-2 py-3">
          <span className={lineLabel}>Phone</span>
          <input className={lineInput} type="tel" inputMode="tel" placeholder="+91 98XXX XXXXX" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone || undefined} />
          {errors.phone && <span role="alert" className="text-[13px] text-[#F3B8AE]">{errors.phone}</span>}
        </label>
      </div>
      {variant === "custom" && (
        <div className="grid gap-3.5 sm:grid-cols-[1fr_200px]">
          <label className="flex flex-col gap-2 py-3">
            <span className={lineLabel}>Where to</span>
            <input className={lineInput} placeholder="Japan in cherry blossom season" value={where} onChange={(e) => setWhere(e.target.value)} />
          </label>
          <label className="flex flex-col gap-2 py-3">
            <span className={lineLabel}>Travellers</span>
            <input className={lineInput} placeholder="2 adults" value={second} onChange={(e) => setSecond(e.target.value)} />
          </label>
        </div>
      )}
      <label className="flex items-start gap-3 text-[14px] leading-[21px] text-[#C8D5D3]">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-gold" aria-invalid={!!errors.consent || undefined} />
        Call or WhatsApp me about this trip. We only use your number for this.
      </label>
      {errors.consent && <span role="alert" className="text-[13px] text-[#F3B8AE]">{errors.consent}</span>}
      {error && !Object.keys(errors).length && <p role="alert" className="text-[14px] text-[#F3B8AE]">{error}</p>}
      <Turnstile onToken={onToken} />
      <div className="flex flex-col items-start gap-5 pt-4 sm:flex-row sm:items-center sm:gap-7">
        <button type="submit" disabled={busy} className={btn.ivory}>
          {busy ? "Sending…" : "Request a callback"}
        </button>
        {whatsappHref && (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border-b border-[#7D9A99] pb-[3px] text-[16px] text-ivory">
            <WhatsAppIcon /> or message us on WhatsApp
          </a>
        )}
      </div>
    </form>
  );
}
