"use client";

import { useEffect } from "react";

/** Bottom sheet simple para acciones secundarias. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl bg-white p-4 pb-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-300" />
        {title ? (
          <h3 className="mb-3 text-lg font-bold text-gray-900">{title}</h3>
        ) : null}
        {children}
      </div>
    </div>
  );
}
