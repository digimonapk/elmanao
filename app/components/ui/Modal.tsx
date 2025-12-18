"use client";

import React, { useEffect } from "react";

export function Modal({
  open,
  title,
  onClose,
  children,
  maxWidthClass = "max-w-lg",
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
}) {
  if (!open) return null;

  // ✅ Cerrar con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="absolute inset-0 flex items-end sm:items-center sm:justify-center">
        <div
          onClick={(e) => e.stopPropagation()}
          className={`
            w-full bg-white shadow-2xl
            h-[100dvh] sm:h-auto
            rounded-none sm:rounded-2xl
            ${maxWidthClass} sm:mx-4
            flex flex-col
          `}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b px-5 py-4 flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900">{title}</h3>
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-full hover:bg-slate-100 flex items-center justify-center"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          {/* Body (scroll) */}
          <div className="flex-1 overflow-auto px-5 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
