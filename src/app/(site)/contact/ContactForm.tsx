"use client";
import { useCallback, useState } from "react";
import { Field, PhoneInput, Turnstile } from "@/components/site/form-parts";
import { postEnquiry } from "@/components/site/enquiry-client";
import { track } from "@/components/site/analytics-client";
import { btn } from "@/components/ui/buttons";
import { CheckIcon } from "@/components/ui/icons";

const TOPICS = ["Planning a new trip", "A trip I've already booked", "Changing or cancelling", "Group or corporate travel", "Something else"];

export function ContactForm() {
  const [f, setF] = useState({ name: "", code: "+91", phone: "", email: "", topic: TOPICS[0], message: "", consent: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [error, setError] = useState("");
  const [ref, setRef] = useState("");
  const [token, setToken] = useState("");
  const onToken = useCallback((t: string) => setToken(t), []);
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fe: Record<string, string> = {};
    if (f.name.trim().length < 2) fe.name = "Please tell us your name.";
    if (f.phone.replace(/\D/g, "").length < 8) fe.phone = "Enter a valid mobile number.";
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) fe.email = "That email doesn't look right.";
    if (!f.consent) fe.consent = "Please tick this so we can contact you.";
    setErrors(fe);
    if (Object.keys(fe).length) return;
    setState("sending");
    const res = await postEnquiry({
      kind: "contact",
      name: f.name,
      countryCode: f.code,
      phone: f.phone,
      email: f.email || undefined,
      message: `[${f.topic}] ${f.message}`.trim(),
      details: { topic: f.topic },
      consent: f.consent,
      turnstileToken: token || undefined,
    });
    if (!res.ok) {
      setErrors(res.fieldErrors ?? {});
      setError(res.error);
      setState("failed");
      return;
    }
    setRef(res.reference);
    setState("sent");
    track("generate_lead", { reference: res.reference, package_name: "Contact form" });
  };

  if (state === "sent")
    return (
      <div role="status" className="flex flex-col gap-4 border border-line bg-white p-8 md:p-10">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-bg text-success"><CheckIcon className="h-5 w-5" /></span>
        <h2 className="font-display text-[34px] leading-[40px] text-teal">Thanks, {f.name.split(" ")[0]} — we&apos;ll call you soon.</h2>
        <p className="text-[16px] leading-[26px] text-charcoal">
          Your reference is <strong data-testid="reference">{ref}</strong>. {f.email ? `A copy is on its way to ${f.email}.` : ""} Typical reply: same working day.
        </p>
      </div>
    );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6 border border-line bg-white p-6 md:p-10">
      <div>
        <h2 className="font-display text-[34px] leading-[40px] text-teal">Send an enquiry</h2>
        <p className="text-[16px] text-stone">No payment, no booking — just a callback.</p>
      </div>
      {state === "failed" && <p role="alert" className="rounded-[4px] bg-danger-bg p-3.5 text-[14px] text-danger">{error}</p>}
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Your name" htmlFor="c-name" error={errors.name}>
          <input id="c-name" className="field-input" autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name || undefined} />
        </Field>
        <Field label="Phone" htmlFor="c-phone" error={errors.phone} hint="We'll call this number. No marketing calls.">
          <PhoneInput id="c-phone" code={f.code} onCode={(v) => set("code", v)} value={f.phone} onChange={(v) => set("phone", v)} invalid={!!errors.phone} />
        </Field>
      </div>
      <Field label="Email (optional)" htmlFor="c-email" error={errors.email}>
        <input id="c-email" type="email" className="field-input" placeholder="you@example.com" value={f.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email || undefined} />
      </Field>
      <Field label="What's it about?" htmlFor="c-topic">
        <select id="c-topic" className="field-input" value={f.topic} onChange={(e) => set("topic", e.target.value)}>
          {TOPICS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Message" htmlFor="c-msg">
        <textarea id="c-msg" rows={5} maxLength={1800} className="field-input" placeholder="Where, roughly when, and who's coming. Anything we should know — kids, elders, food, budget." value={f.message} onChange={(e) => set("message", e.target.value)} />
      </Field>
      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-3 text-[15px] leading-[22px] text-charcoal">
          <input type="checkbox" className="mt-0.5 h-5 w-5 accent-teal" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} aria-invalid={!!errors.consent || undefined} />
          I agree to Safarscape contacting me about this enquiry by phone, WhatsApp or email, as described in the privacy policy.
        </label>
        {errors.consent && <p role="alert" className="pl-8 text-[13px] text-danger">{errors.consent}</p>}
      </div>
      <Turnstile onToken={onToken} />
      <div className="flex flex-col justify-between gap-4 border-t border-line pt-6 sm:flex-row sm:items-center">
        <span className="text-[14px] text-stone">Typical reply: same working day</span>
        <button type="submit" disabled={state === "sending"} className={btn.primarySm}>{state === "sending" ? "Sending…" : "Request a callback"}</button>
      </div>
    </form>
  );
}
