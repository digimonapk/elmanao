"use client";

import React from "react";

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidthClass} max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-base font-black text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
