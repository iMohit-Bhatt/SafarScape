"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, PhoneInput, Stepper, Turnstile } from "@/components/site/form-parts";
import { postEnquiry, rememberEnquiry } from "@/components/site/enquiry-client";
import { btn } from "@/components/ui/buttons";
import { WhatsAppIcon } from "@/components/ui/icons";
import { formatINR, MONTHS } from "@/lib/format";

const STYLES = ["Simple & clean", "Comfortable 4-star", "Boutique & heritage", "Splurge"];
const INTERESTS = ["Beaches", "Kid-friendly", "Food", "Wildlife", "Slow pace", "Adventure", "Culture & history", "Snow"];
const KEY = "sfs_custom_trip_draft";

type Draft = {
  name: string; code: string; phone: string; email: string; city: string;
  places: string[]; placeNote: string; dateMode: "month" | "exact"; month: string; start: string; end: string; nights: number;
  adults: number; children: number; childAges: string[];
  budgetMin: number; budgetMax: number; style: string; interests: string[];
  notes: string; consent: boolean;
};

function upcomingMonths() {
  const now = new Date();
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  });
}

const empty: Draft = {
  name: "", code: "+91", phone: "", email: "", city: "",
  places: [], placeNote: "", dateMode: "month", month: "", start: "", end: "", nights: 6,
  adults: 2, children: 0, childAges: [],
  budgetMin: 25000, budgetMax: 50000, style: "", interests: [],
  notes: "", consent: false,
};

function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`rounded-full border px-3.5 py-1.5 text-[14px] ${on ? "border-teal bg-info-bg text-teal" : "border-line bg-white text-charcoal"}`}>
      {children}
      {on && " ✓"}
    </button>
  );
}

function H({ n, children }: { n: number; children: React.ReactNode }) {
  return (
  <div className="flex items-baseline gap-6 border-t border-teal/40 pt-6 md:gap-10">
    <span className="font-display text-[28px] text-teal">{n}</span>
    <h2 className="font-display text-[28px] leading-[34px] text-teal">{children}</h2>
  </div>
  );
}

export function CustomTripForm({ destinations, whatsappHref }: { destinations: string[]; whatsappHref: string | null }) {
  const router = useRouter();
  const [d, setD] = useState<Draft>(empty);
  const [loaded, setLoaded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "failed">("idle");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const onToken = useCallback((t: string) => setToken(t), []);
  const [months] = useState(upcomingMonths);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const toggle = (k: "places" | "interests", v: string) => setD((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // Restoring the on-device draft must wait for hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setD({ ...empty, ...JSON.parse(raw), consent: false });
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      const { consent: _c, ...rest } = d;
      void _c;
      localStorage.setItem(KEY, JSON.stringify(rest));
    } catch {}
  }, [d, loaded]);

  const sections = [
    { n: 1, label: "About you", done: d.name.trim().length > 1 && d.phone.replace(/\D/g, "").length >= 8 },
    { n: 2, label: "Your trip", done: d.places.length > 0 || d.placeNote.trim().length > 2 },
    { n: 3, label: "Who's travelling", done: d.adults > 0 },
    { n: 4, label: "Budget & style", done: Boolean(d.style) },
    { n: 5, label: "Anything else", done: d.notes.trim().length > 0 },
  ];
  const doneCount = sections.filter((s) => s.done).length;
  const when = d.dateMode === "month" ? (d.month ? `${d.month} · flexible` : "") : d.start ? `${d.start}${d.end ? ` → ${d.end}` : ""}` : "";
  const travellers = `${d.adults} adult${d.adults > 1 ? "s" : ""}${d.children ? `, ${d.children} child${d.children > 1 ? "ren" : ""}${d.childAges.some(Boolean) ? ` (${d.childAges.filter(Boolean).join(", ")})` : ""}` : ""}`;
  const budget = `${formatINR(d.budgetMin)} – ${d.budgetMax >= 100000 ? "₹1L+" : formatINR(d.budgetMax)}`;
  const title = d.places.length ? `${d.places.join(" & ")}${d.nights ? `, ${d.nights} nights` : ""}${d.month && d.dateMode === "month" ? ` in ${d.month.split(" ")[0]}` : ""}` : "Your trip so far";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fe: Record<string, string> = {};
    if (d.name.trim().length < 2) fe.name = "Please tell us your name.";
    if (d.phone.replace(/\D/g, "").length < 8) fe.phone = "Enter a valid mobile number.";
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) fe.email = "That email doesn't look right.";
    if (!d.places.length && !d.placeNote.trim()) fe.places = "Pick a place or describe what you have in mind.";
    if (!d.consent) fe.consent = "Please tick this so we can contact you.";
    setErrors(fe);
    if (Object.keys(fe).length) {
      document.querySelector<HTMLElement>("[aria-invalid=true], [data-error=true]")?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    setState("sending");
    const res = await postEnquiry({
      kind: "custom",
      name: d.name,
      countryCode: d.code,
      phone: d.phone,
      email: d.email || undefined,
      departureCity: d.city || undefined,
      travelMonth: when || undefined,
      adults: d.adults,
      children: d.children,
      budget,
      message: d.notes || undefined,
      details: {
        destinations: d.places,
        placeNote: d.placeNote || undefined,
        nights: d.nights,
        childAges: d.childAges.filter(Boolean),
        stayStyle: d.style || undefined,
        interests: d.interests,
      },
      consent: d.consent,
      turnstileToken: token || undefined,
    });
    if (!res.ok) {
      setErrors(res.fieldErrors ?? {});
      setError(res.error);
      setState("failed");
      return;
    }
    rememberEnquiry({
      reference: res.reference,
      firstName: res.firstName,
      email: d.email || undefined,
      phone: `${d.code} ${d.phone}`,
      trip: title === "Your trip so far" ? "Custom trip" : title,
      tripMeta: d.places.join(", ") || "Custom trip",
      departure: when || "Flexible",
      travellers,
      from: d.city || undefined,
      budget,
      note: d.notes || undefined,
      destinationName: d.places[0] ?? "your trip",
    });
    try {
      localStorage.removeItem(KEY);
    } catch {}
    router.push("/enquiry/received");
  };


  return (
    <div className="page-x container-x pb-24 pt-10 md:pt-14">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="flex flex-col gap-3">
          <p className="eyebrow">Custom trip · about 4 minutes</p>
          <h1 className="font-display text-[44px] leading-[48px] tracking-[-0.02em] text-teal md:text-[64px] md:leading-[68px]">Plan a trip with us</h1>
        </div>
        <p className="text-[13px] text-stone">Answers save on this device as you go</p>
      </div>
      <ol className="mt-6 grid grid-cols-5 gap-2" aria-label="Progress">
        {sections.map((s) => (
          <li key={s.n} className={`border-t-[3px] pt-2 text-[11px] md:text-[13px] ${s.done ? "border-teal text-charcoal" : "border-line text-stone"}`}>
            <span className="hidden sm:inline">{s.n} {s.label}</span>
            <span className="sm:hidden">{s.n}</span>
            {s.done && <span className="sr-only"> (done)</span>}
            {s.done && <span aria-hidden> ✓</span>}
          </li>
        ))}
      </ol>

      <div className="mt-12 flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-14">
        <form onSubmit={submit} noValidate className="flex min-w-0 flex-1 flex-col gap-14 lg:max-w-[760px]">
          <section className="flex flex-col gap-6">
            <H n={1}>About you</H>
            <div className="grid gap-5 md:ml-[64px] md:grid-cols-2">
              <Field label="Your name" htmlFor="ct-name" error={errors.name}>
                <input id="ct-name" className="field-input" autoComplete="name" value={d.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name || undefined} />
              </Field>
              <Field label="Mobile number" htmlFor="ct-phone" error={errors.phone}>
                <PhoneInput id="ct-phone" code={d.code} onCode={(v) => set("code", v)} value={d.phone} onChange={(v) => set("phone", v)} invalid={!!errors.phone} />
              </Field>
              <Field label="Email" htmlFor="ct-email" error={errors.email} optional>
                <input id="ct-email" type="email" className="field-input" autoComplete="email" value={d.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email || undefined} />
              </Field>
              <Field label="Travelling from" htmlFor="ct-city">
                <input id="ct-city" className="field-input" placeholder="City" value={d.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <H n={2}>Your trip</H>
            <div className="flex flex-col gap-6 md:ml-[64px]">
              <div className="flex flex-col gap-3" data-error={!!errors.places}>
                <div className="flex justify-between text-[15px]">
                  <span className="font-medium text-charcoal">Where would you like to go?</span>
                  <span className="text-stone">Pick any, or none</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {destinations.map((p) => (
                    <Chip key={p} on={d.places.includes(p)} onClick={() => toggle("places", p)}>{p}</Chip>
                  ))}
                </div>
                <input className="field-input" aria-label="Describe the place" placeholder="Somewhere with a quiet beach after the backwaters" value={d.placeNote} onChange={(e) => set("placeNote", e.target.value)} />
                {errors.places && <p role="alert" className="text-[13px] text-danger">{errors.places}</p>}
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-[15px] font-medium text-charcoal">When are you thinking?</span>
                <div className="inline-flex self-start rounded-[4px] border border-line bg-sand/40 p-0.5" role="tablist">
                  {(["exact", "month"] as const).map((m) => (
                    <button key={m} type="button" role="tab" aria-selected={d.dateMode === m} onClick={() => set("dateMode", m)} className={`rounded-[3px] px-4 py-2 text-[14px] ${d.dateMode === m ? "bg-white font-medium text-charcoal" : "text-stone"}`}>
                      {m === "exact" ? "Exact dates" : "Flexible month"}
                    </button>
                  ))}
                </div>
                {d.dateMode === "month" ? (
                  <div className="flex flex-wrap gap-2">
                    {[...months, "Later"].map((m) => (
                      <Chip key={m} on={d.month === m} onClick={() => set("month", d.month === m ? "" : m)}>{m}</Chip>
                    ))}
                  </div>
                ) : (
                  <div className="grid max-w-[420px] grid-cols-2 gap-3">
                    <input type="date" aria-label="Start date" className="field-input" value={d.start} onChange={(e) => set("start", e.target.value)} />
                    <input type="date" aria-label="End date" className="field-input" value={d.end} min={d.start} onChange={(e) => set("end", e.target.value)} />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-[15px] font-medium text-charcoal">How many nights?</span>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                  <div className="w-[200px]"><Stepper label="Nights" value={d.nights} onChange={(n) => set("nights", n)} min={1} max={30} suffix="nights" /></div>
                  {d.places.length > 1 && <span className="text-[13px] text-stone">Two places usually works best with 7–10 nights.</span>}
                </div>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <H n={3}>Who&apos;s travelling</H>
            <div className="flex flex-col gap-5 md:ml-[64px]">
              <div className="grid max-w-[440px] grid-cols-2 gap-4">
                <Field label="Adults"><Stepper label="Adults" value={d.adults} onChange={(n) => set("adults", n)} min={1} max={40} /></Field>
                <Field label="Children (under 12)"><Stepper label="Children" value={d.children} onChange={(n) => setD((p) => ({ ...p, children: n, childAges: Array.from({ length: n }, (_, i) => p.childAges[i] ?? "") }))} min={0} max={10} /></Field>
              </div>
              {d.children > 0 && (
                <div className="flex flex-col gap-3 rounded-[4px] border border-line bg-white p-4">
                  <span className="text-[13px] text-stone">Children&apos;s ages — helps us pick rooms and activities</span>
                  <div className="flex flex-wrap gap-2">
                    {d.childAges.map((age, i) => (
                      <select key={i} aria-label={`Child ${i + 1} age`} className="field-input w-[130px]!" value={age} onChange={(e) => set("childAges", d.childAges.map((a, j) => (j === i ? e.target.value : a)))}>
                        <option value="">Child {i + 1}</option>
                        {Array.from({ length: 12 }, (_, a) => (
                          <option key={a} value={String(a)}>Child {i + 1} · {a}</option>
                        ))}
                      </select>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <H n={4}>Budget &amp; style</H>
            <div className="flex flex-col gap-6 md:ml-[64px]">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between text-[15px]">
                  <span className="font-medium text-charcoal">Budget per person, excluding flights</span>
                  <span className="text-charcoal" data-testid="budget">{budget}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1 text-[13px] text-stone">
                    Minimum
                    <input type="range" min={15000} max={100000} step={5000} value={d.budgetMin} onChange={(e) => set("budgetMin", Math.min(Number(e.target.value), d.budgetMax))} className="accent-teal" />
                  </label>
                  <label className="flex flex-col gap-1 text-[13px] text-stone">
                    Maximum
                    <input type="range" min={15000} max={100000} step={5000} value={d.budgetMax} onChange={(e) => set("budgetMax", Math.max(Number(e.target.value), d.budgetMin))} className="accent-teal" />
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-[15px] font-medium text-charcoal">Where you&apos;d like to stay</span>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map((s) => <Chip key={s} on={d.style === s} onClick={() => set("style", d.style === s ? "" : s)}>{s}</Chip>)}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-[15px] font-medium text-charcoal">What matters on this trip?</span>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((s) => <Chip key={s} on={d.interests.includes(s)} onClick={() => toggle("interests", s)}>{s}</Chip>)}
                </div>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <H n={5}>Anything else</H>
            <div className="flex flex-col gap-5 md:ml-[64px]">
              <Field label="Tell us more, in your own words" htmlFor="ct-notes" optional>
                <textarea id="ct-notes" rows={4} maxLength={2000} className="field-input" value={d.notes} onChange={(e) => set("notes", e.target.value)} placeholder="A birthday on the trip, dietary needs, a hotel you loved…" />
              </Field>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-start gap-3 text-[15px] leading-[22px] text-charcoal">
                  <input type="checkbox" className="mt-0.5 h-5 w-5 accent-teal" checked={d.consent} onChange={(e) => set("consent", e.target.checked)} aria-invalid={!!errors.consent || undefined} />
                  I&apos;m happy for Safarscape to contact me about this trip by phone, email or WhatsApp.
                </label>
                {errors.consent && <p role="alert" className="pl-8 text-[13px] text-danger">{errors.consent}</p>}
              </div>
              <Turnstile onToken={onToken} />
            </div>
          </section>

          {state === "failed" && (
            <div role="alert" className="rounded-[4px] border border-danger/30 bg-danger-bg p-4 text-[14px] text-danger md:ml-[64px]">
              <p className="font-medium">Your trip request wasn&apos;t sent.</p>
              <p>{error} Your answers are saved on this device.</p>
            </div>
          )}

          <div className="flex flex-col justify-between gap-5 border-t border-line pt-8 sm:flex-row sm:items-center md:ml-[64px]">
            <p className="max-w-[300px] text-[13px] leading-5 text-stone">Nothing is booked or charged. An advisor calls you to shape the plan.</p>
            <button type="submit" disabled={state === "sending"} className={btn.primary}>
              {state === "sending" ? "Sending…" : state === "failed" ? "Try again" : "Send my trip request"}
            </button>
          </div>
        </form>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:w-[380px] lg:shrink-0" aria-label="Your trip so far">
          <div className="flex flex-col gap-5 rounded-[4px] border border-line bg-white p-6">
            <p className="eyebrow">Your trip so far</p>
            <p className="font-display text-[26px] leading-[32px] text-teal">{title}</p>
            <dl className="flex flex-col">
              {[
                ["From", d.city],
                ["When", when],
                ["Travellers", travellers],
                ["Budget", `${budget} per person`],
                ["Stay", d.style],
                ["Interests", d.interests.join(", ")],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-t border-line py-3 text-[14px]">
                  <dt className="text-stone">{k}</dt>
                  <dd className="text-right text-charcoal">{v || "—"}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[12px] text-stone">
                <span>{doneCount} of 5 sections done</span>
                <span>{doneCount >= 4 ? "Under a minute left" : "A few minutes left"}</span>
              </div>
              <div className="h-1 bg-line"><div className="h-1 bg-teal transition-all" style={{ width: `${(doneCount / 5) * 100}%` }} /></div>
            </div>
          </div>
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[14px] text-whatsapp">
              <WhatsAppIcon /> Stuck? Ask us on WhatsApp
            </a>
          )}
        </aside>
      </div>
    </div>
  );
}
