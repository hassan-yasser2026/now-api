"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastTone = "success" | "error" | "info";
type ToastMessage = { id: number; message: string; tone: ToastTone };
type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  const showToast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = ++nextId.current;
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
    timers.current.set(
      id,
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
        timers.current.delete(id);
      }, 3600),
    );
  }, []);

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) {
        window.clearTimeout(timer);
      }
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-label="الإشعارات"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-20 z-[100] mx-auto grid max-w-md gap-2"
        role="status"
      >
        {toasts.map((toast) => (
          <div
            className={`pointer-events-auto flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold shadow-xl backdrop-blur ${
              toast.tone === "success"
                ? "border-emerald-200 bg-emerald-50/95 text-emerald-900"
                : toast.tone === "error"
                  ? "border-red-200 bg-red-50/95 text-red-900"
                  : "border-now-100 bg-white/95 text-now-900"
            }`}
            key={toast.id}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/80">
              {toast.tone === "success" ? "✓" : toast.tone === "error" ? "!" : "i"}
            </span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
