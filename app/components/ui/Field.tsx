"use client";

import React from "react";

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-sm font-black text-slate-900">
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none
      focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/40 ${
        props.className ?? ""
      }`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none
      focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/40 ${
        props.className ?? ""
      }`}
    />
  );
}

export function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { full?: boolean }
) {
  const { full = true, className, ...rest } = props;
  return (
    <button
      {...rest}
      className={`${
        full ? "w-full" : ""
      } rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 px-4 py-3
      text-sm font-black text-slate-900 shadow-lg shadow-yellow-500/25 transition hover:-translate-y-[1px] disabled:opacity-50 disabled:hover:translate-y-0 ${
        className ?? ""
      }`}
    />
  );
}

export function SecondaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { full?: boolean }
) {
  const { full = true, className, ...rest } = props;
  return (
    <button
      {...rest}
      className={`${
        full ? "w-full" : ""
      } rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700
      transition hover:bg-slate-200 disabled:opacity-50 ${className ?? ""}`}
    />
  );
}
