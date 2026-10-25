"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/admin/Toast";
import type { ActionResult } from "@/lib/action-result";

export function useSave() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const run = <T,>(fn: () => Promise<ActionResult<T>>, onOk?: (r: { data?: T }) => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        toast(r.error, "error");
        return;
      }
      setErrors({});
      toast(r.message ?? "Saved");
      onOk?.(r);
      router.refresh();
    });
  return { run, pending, errors };
}
