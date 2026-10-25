"use client";
import { useEffect, useId, useRef } from "react";

export function Field({
  label,
  error,
  hint,
  optional,
  children,
  className = "",
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="text-[15px] font-medium text-charcoal">
          {label}
        </label>
        {optional && <span className="text-[14px] text-stone">Optional</span>}
      </div>
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-stone">{hint}</p>
      ) : null}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 20,
  label,
  id,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
  id?: string;
  suffix?: string;
}) {
  return (
    <div className="flex h-[48px] items-stretch rounded-[4px] border border-line bg-white" role="group" aria-label={label}>
      <button
        type="button"
        className="w-12 border-r border-line text-[18px] text-charcoal disabled:text-line"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Fewer ${label.toLowerCase()}`}
      >
        −
      </button>
      <input
        id={id}
        inputMode="numeric"
        className="w-full min-w-0 flex-1 bg-transparent text-center text-[16px] outline-none"
        value={suffix ? `${value} ${suffix}` : value}
        readOnly={Boolean(suffix)}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, "") || "0", 10);
          onChange(Math.min(max, Math.max(min, n)));
        }}
        aria-label={label}
      />
      <button
        type="button"
        className="w-12 border-l border-line text-[18px] text-charcoal disabled:text-line"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`More ${label.toLowerCase()}`}
      >
        +
      </button>
    </div>
  );
}

export const countryCodes = ["+91", "+971", "+1", "+44", "+61", "+65", "+966", "+974", "+49"];

export function PhoneInput({
  id,
  code,
  onCode,
  value,
  onChange,
  invalid,
}: {
  id: string;
  code: string;
  onCode: (c: string) => void;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  return (
    <div className={`flex rounded-[4px] border bg-white ${invalid ? "border-danger" : "border-line"} focus-within:border-teal`}>
      <select
        aria-label="Country code"
        value={code}
        onChange={(e) => onCode(e.target.value)}
        className="rounded-l-[4px] border-r border-line bg-ivory px-3 text-[16px] outline-none"
      >
        {countryCodes.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="98110 45672"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className="w-full min-w-0 rounded-r-[4px] px-3.5 py-3 text-[16px] outline-none"
      />
    </div>
  );
}

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; reset: (id?: string) => void };
  }
}

/** Renders Cloudflare Turnstile when NEXT_PUBLIC_TURNSTILE_SITE_KEY is configured; otherwise nothing. */
export function Turnstile({ onToken }: { onToken: (t: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId();
  useEffect(() => {
    if (!siteKey || !ref.current) return;
    const el = ref.current;
    const render = () => window.turnstile?.render(el, { sitekey: siteKey, callback: onToken, theme: "light" });
    if (window.turnstile) render();
    else {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.onload = render;
      document.head.appendChild(s);
    }
  }, [siteKey, onToken]);
  if (!siteKey) return null;
  return <div ref={ref} id={`ts-${uid}`} className="min-h-[65px]" />;
}

export const budgetOptions = ["Under ₹20k", "₹20k – ₹30k", "₹30k – ₹45k", "₹45k – ₹60k", "₹60k – ₹1L", "Over ₹1L", "Not sure yet"];
