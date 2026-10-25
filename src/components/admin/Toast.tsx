"use client";
import { createContext, useCallback, useContext, useState } from "react";

type Kind = "success" | "error";
const Ctx = createContext<(msg: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string; kind: Kind }[]>([]);
  const push = useCallback((msg: string, kind: Kind = "success") => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, msg, kind }]);
    setTimeout(() => setItems((s) => s.filter((i) => i.id !== id)), 4500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="fixed bottom-20 right-4 z-[60] flex flex-col gap-2 lg:bottom-6">
        {items.map((i) => (
          <div key={i.id} role={i.kind === "error" ? "alert" : "status"} className={`rounded-[4px] px-4 py-3 text-[14px] shadow-lg ${i.kind === "error" ? "bg-danger text-white" : "bg-charcoal text-ivory"}`}>
            {i.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
