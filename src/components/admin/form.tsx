"use client";
import { useId } from "react";

const lbl = "text-[14px] font-medium text-charcoal";

export function AField({ label, error, hint, count, max, children, className = "" }: { label: string; error?: string; hint?: string; count?: number; max?: number; children: (id: string) => React.ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className={lbl}>{label}</label>
        {max != null && <span className={`text-[12px] ${count! > max ? "text-danger" : "text-stone"}`}>{count} / {max}</span>}
      </div>
      {children(id)}
      {error ? <p role="alert" className="text-[13px] text-danger">{error}</p> : hint ? <p className="text-[13px] text-stone">{hint}</p> : null}
    </div>
  );
}

export function Input({ label, value, onChange, error, hint, max, type = "text", placeholder, className, prefix, required }: {
  label: string; value: string | number; onChange: (v: string) => void; error?: string; hint?: string; max?: number; type?: string; placeholder?: string; className?: string; prefix?: string; required?: boolean;
}) {
  return (
    <AField label={label} error={error} hint={hint} max={max} count={String(value ?? "").length} className={className}>
      {(id) => (
        <div className="flex">
          {prefix && <span className="flex items-center rounded-l-[4px] border border-r-0 border-line bg-admin-bg px-3 text-[14px] text-stone">{prefix}</span>}
          <input id={id} type={type} required={required} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error || undefined} className={`field-input text-[15px]! ${prefix ? "rounded-l-none!" : ""}`} />
        </div>
      )}
    </AField>
  );
}

export function TextArea({ label, value, onChange, error, hint, max, rows = 4, placeholder, className }: { label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string; max?: number; rows?: number; placeholder?: string; className?: string }) {
  return (
    <AField label={label} error={error} hint={hint} max={max} count={value?.length ?? 0} className={className}>
      {(id) => <textarea id={id} rows={rows} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error || undefined} className="field-input text-[15px]!" />}
    </AField>
  );
}

export function Select({ label, value, onChange, options, error, className }: { label: string; value: string | number; onChange: (v: string) => void; options: [string | number, string][]; error?: string; className?: string }) {
  return (
    <AField label={label} error={error} className={className}>
      {(id) => (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error || undefined} className="field-input text-[15px]!">
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      )}
    </AField>
  );
}

export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <span className="relative mt-0.5">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="block h-6 w-10 rounded-full bg-line transition-colors peer-checked:bg-teal peer-focus-visible:outline-2 peer-focus-visible:outline-focus" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
      </span>
      <span>
        <span className="block text-[15px] font-medium text-charcoal">{label}</span>
        {hint && <span className="block text-[13px] text-stone">{hint}</span>}
      </span>
    </label>
  );
}

/** One item per line editor for simple string lists. */
export function LinesInput({ label, value, onChange, hint, placeholder }: { label: string; value: string[]; onChange: (v: string[]) => void; hint?: string; placeholder?: string }) {
  return (
    <AField label={label} hint={hint ?? "One per line."}>
      {(id) => (
        <textarea id={id} rows={Math.max(4, value.length + 1)} placeholder={placeholder} className="field-input text-[15px]!" value={value.join("\n")} onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.replace(/^\s+/, "")).filter((s, i, a) => s || i === a.length - 1))} />
      )}
    </AField>
  );
}

export function Panel({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-[8px] border border-line bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-medium text-charcoal">{title}</h2>
          {subtitle && <p className="text-[14px] text-stone">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function moveItem<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
