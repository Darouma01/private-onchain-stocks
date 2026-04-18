"use client";

import type { ReactNode } from "react";

export function TradeModal({
  children,
  onClose,
  open,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  if (!open) return null;

  return (
    <div className="trade-modal-backdrop" role="presentation">
      <section aria-modal="true" className="trade-modal" role="dialog">
        <div className="row">
          <strong>{title}</strong>
          <button className="ghost-button" onClick={onClose} type="button">
            Close
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
