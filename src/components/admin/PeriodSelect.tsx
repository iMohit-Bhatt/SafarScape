"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function PeriodSelect({ value, param = "period" }: { value: string; param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <select
      aria-label="Period"
      value={value}
      onChange={(e) => {
        const n = new URLSearchParams(sp.toString());
        n.set(param, e.target.value);
        router.push(`${pathname}?${n}`);
      }}
      className="rounded-[4px] border border-line bg-white px-3.5 py-2.5 text-[15px]"
    >
      <option value="today">Today</option>
      <option value="7d">Last 7 days</option>
      <option value="30d">Last 30 days</option>
      <option value="90d">Last 90 days</option>
      <option value="month">This month</option>
    </select>
  );
}
