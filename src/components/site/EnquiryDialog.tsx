"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Stepper, PhoneInput, Turnstile, budgetOptions } from "./form-parts";
import { postEnquiry, rememberEnquiry } from "./enquiry-client";
import { track } from "./analytics-client";
import { btn } from "@/components/ui/buttons";
import { CloseIcon, WhatsAppIcon } from "@/components/ui/icons";

export type EnquiryContext = {
  kind: "package" | "destination";
  packageSlug?: string;
  destinationSlug?: string;
  title: string;
  meta: string; // e.g. "Kashmir · 5N/6D"
  color: string;
  price?: number;
  departures: { id: number; label: string }[];
};

type State = "form" | "submitting" | "failed";

export function useEnquiryDialog() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}

export function EnquiryDialog({
  ctx,
  open,
  onClose,
  whatsappHref,
  initialDepartureId,
  initialAdults = 2,
  initialChildren = 0,
}: {
  ctx: EnquiryContext;
  open: boolean;
  onClose: () => void;
  whatsappHref: string | null;
  initialDepartureId?: number | null;
  initialAdults?: number;
  initialChildren?: number;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>("form");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [code, setCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [departure, setDeparture] = useState<string>(initialDepartureId ? String(initialDepartureId) : "");
  const [month, setMonth] = useState("");
  const [city, setCity] = useState("");
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [token, setToken] = useState("");
  const onToken = useCallback((t: string) => setToken(t), []);

  // Keep in step with the booking card when it changes (departure row clicked, travellers edited).
  const initKey = `${initialDepartureId ?? ""}|${initialAdults}|${initialChildren}`;
  const [prevInit, setPrevInit] = useState(initKey);
  if (initKey !== prevInit) {
    setPrevInit(initKey);
    setDeparture(initialDepartureId ? String(initialDepartureId) : "");
    setAdults(initialAdults);
    setChildren(initialChildren);
  }

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        const els = [...dialogRef.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),input,select,textarea")];
        const first = els[0];
        const last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    track("enquiry_open", { package_name: ctx.title });
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [open, onClose, ctx.title]);

  if (!open) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = "Please tell us your name.";
    const digits = phone.replace(/\D/g, "");
    if (!digits) e.phone = "We need a number to call you back.";
    else if (code === "+91" ? !/^(?:0|91)?[6-9]\d{9}$/.test(digits) : digits.length < 6 || digits.length > 13)
      e.phone = "Enter a valid mobile number, e.g. 98110 45672.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "That email doesn't look right.";
    if (!consent) e.consent = "Please tick this so we can contact you.";
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      setError("");
      dialogRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    setState("submitting");
    setError("");
    const dep = ctx.departures.find((d) => String(d.id) === departure);
    const res = await postEnquiry({
      kind: ctx.kind,
      packageSlug: ctx.packageSlug,
      destinationSlug: ctx.destinationSlug,
      name,
      countryCode: code,
      phone,
      email: email || undefined,
      departureId: dep?.id,
      travelMonth: dep?.label ?? (month || undefined),
      departureCity: city || undefined,
      adults,
      children,
      budget: budget || undefined,
      message: message || undefined,
      consent,
      website,
      turnstileToken: token || undefined,
    });
    if (res.ok) {
      rememberEnquiry(
        {
          reference: res.reference,
          firstName: res.firstName,
          email: email || undefined,
          phone: `${code} ${phone}`,
          trip: ctx.title,
          tripMeta: ctx.meta,
          departure: dep?.label ?? (month || "Flexible"),
          travellers: `${adults} adult${adults > 1 ? "s" : ""}${children ? `, ${children} child${children > 1 ? "ren" : ""}` : ""}`,
          from: city || undefined,
          budget: budget || undefined,
          note: message || undefined,
          destinationName: ctx.meta.split(" · ")[0],
        },
        ctx.price,
      );
      router.push("/enquiry/received");
      return;
    }
    setErrors(res.fieldErrors ?? {});
    setError(res.error);
    setState(res.fieldErrors ? "form" : "failed");
  };

  const err = (k: string) => errors[k];
  const submitting = state === "submitting";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/45 md:items-start md:overflow-y-auto md:py-[72px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="enquiry-title"
        className="flex max-h-[94dvh] w-full flex-col overflow-y-auto rounded-t-[12px] bg-white md:max-h-none md:max-w-[640px] md:rounded-[8px]"
      >
        <div className="flex flex-col gap-4 border-b border-line px-5 pb-6 pt-6 md:px-10 md:pt-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <p className="eyebrow">Enquire about this trip</p>
              <h2 id="enquiry-title" className="font-display text-[28px] leading-[32px] text-teal md:text-[36px] md:leading-[40px]">
                Tell us a little, we&apos;ll call you back
              </h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="mt-1 p-1 text-charcoal">
              <CloseIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="inline-flex items-center gap-3 self-start rounded-full border border-line bg-ivory py-2 pl-2 pr-4 text-[14px] text-charcoal">
            <span className="h-7 w-7 rounded-full" style={{ backgroundColor: ctx.color }} aria-hidden />
            {ctx.meta.split(" · ")[0]} · {ctx.title}
            {ctx.meta.includes(" · ") ? ` · ${ctx.meta.split(" · ").slice(1).join(" · ")}` : ""}
          </div>
        </div>

        <form onSubmit={submit} noValidate className="flex flex-col gap-5 px-5 py-6 md:px-10 md:py-8">
          {state === "failed" && (
            <div role="alert" className="rounded-[4px] border border-danger/30 bg-danger-bg p-4 text-[14px] leading-[22px] text-danger">
              <p className="font-medium">Your enquiry wasn&apos;t sent.</p>
              <p>{error} Your details are still here.</p>
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block underline">
                  Message us on WhatsApp instead
                </a>
              )}
            </div>
          )}
          {state !== "failed" && error && Object.keys(errors).length > 0 && (
            <p role="alert" className="text-[14px] text-danger">{error}</p>
          )}
          <Field label="Your name" htmlFor="enq-name" error={err("name")}>
            <input id="enq-name" className="field-input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!err("name") || undefined} aria-describedby={err("name") ? "enq-name-error" : undefined} />
          </Field>
          <div className="grid gap-5 md:grid-cols-2 md:gap-4">
            <Field label="Mobile number" htmlFor="enq-phone" error={err("phone")}>
              <PhoneInput id="enq-phone" code={code} onCode={setCode} value={phone} onChange={setPhone} invalid={!!err("phone")} />
            </Field>
            <Field label="Email" htmlFor="enq-email" error={err("email")}>
              <input id="enq-email" type="email" className="field-input" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err("email") || undefined} aria-describedby={err("email") ? "enq-email-error" : undefined} />
            </Field>
          </div>
          <div className="grid gap-5 md:grid-cols-2 md:gap-4">
            <Field label="Preferred departure or month" htmlFor="enq-when">
              {ctx.departures.length ? (
                <select id="enq-when" className="field-input" value={departure} onChange={(e) => setDeparture(e.target.value)}>
                  <option value="">My own dates / flexible</option>
                  {ctx.departures.map((d) => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              ) : (
                <input id="enq-when" className="field-input" placeholder="e.g. January 2027" value={month} onChange={(e) => setMonth(e.target.value)} />
              )}
            </Field>
            <Field label="Travelling from" htmlFor="enq-city">
              <input id="enq-city" className="field-input" placeholder="City, e.g. Pune" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Field label="Adults" error={err("adults")}>
              <Stepper label="Adults" value={adults} onChange={setAdults} min={1} max={40} />
            </Field>
            <Field label="Children (under 12)">
              <Stepper label="Children" value={children} onChange={setChildren} min={0} max={20} />
            </Field>
            <Field label="Budget per person" htmlFor="enq-budget" className="col-span-2 md:col-span-1">
              <select id="enq-budget" className="field-input" value={budget} onChange={(e) => setBudget(e.target.value)}>
                <option value="">Select</option>
                {budgetOptions.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Anything we should know?" htmlFor="enq-msg" optional error={err("message")}>
            <textarea id="enq-msg" rows={3} className="field-input resize-y" placeholder="Anniversary trip, first time in snow, prefer a quieter houseboat…" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} />
          </Field>
          <div className="hidden" aria-hidden>
            <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" /></label>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-start gap-3 text-[15px] leading-[22px] text-charcoal">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-teal"
                aria-invalid={!!err("consent") || undefined}
                aria-describedby={err("consent") ? "enq-consent-error" : undefined}
              />
              I&apos;m happy for Safarscape to contact me about this enquiry by phone, email or WhatsApp.
            </label>
            {err("consent") && <p id="enq-consent-error" role="alert" className="pl-8 text-[13px] text-danger">{err("consent")}</p>}
          </div>
          <Turnstile onToken={onToken} />
          <div className="grid gap-3 md:grid-cols-2">
            <button type="submit" className={`${btn.primary} py-[15px]`} disabled={submitting} aria-busy={submitting}>
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-ivory/40 border-t-ivory" aria-hidden /> Sending…
                </>
              ) : state === "failed" ? (
                "Try again"
              ) : (
                "Send enquiry"
              )}
            </button>
            {whatsappHref && (
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={btn.whatsapp} onClick={() => track("whatsapp_click", { placement: "enquiry_dialog", package_name: ctx.title })}>
                <WhatsAppIcon /> Ask on WhatsApp instead
              </a>
            )}
          </div>
          <p className="text-center text-[13px] leading-5 text-stone">
            Nothing is booked or charged. An advisor calls you back, and we only use your details for this trip.{" "}
            <a href="/privacy" className="underline">Privacy policy</a>
          </p>
        </form>
      </div>
    </div>
  );
}
