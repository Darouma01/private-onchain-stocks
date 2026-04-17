"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

type ToastKind = "success" | "error" | "pending" | "info" | "warning";
type Toast = { id: number; kind: ToastKind; message: string };
type ToastContextValue = { showToast: (kind: ToastKind, message: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

const defaults: Toast[] = [
  { id: 1, kind: "success", message: "✅ Wrapped successfully 🔒" },
  { id: 2, kind: "error", message: "❌ Transaction failed" },
  { id: 3, kind: "pending", message: "⏳ Transaction submitted..." },
  { id: 4, kind: "info", message: "🔒 Balance revealed (this session only)" },
  { id: 5, kind: "warning", message: "⚠️ Collateral health critical" },
];

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now();
    setToasts((current) => [...current, { id, kind, message }]);
    window.setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  useEffect(() => {
    const timer = window.setTimeout(() => setToasts(defaults), 900);
    const clearTimer = window.setTimeout(() => setToasts([]), 4900);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clearTimer);
    };
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div className={`toast ${toast.kind}`} key={toast.id}>
            <span>{toast.message}</span>
            <button aria-label="Dismiss notification" onClick={() => dismiss(toast.id)} type="button">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) return { showToast: () => undefined };
  return context;
}
