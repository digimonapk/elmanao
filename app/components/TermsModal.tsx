"use client";

import React, { useEffect, useState } from "react";

export default function TermsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // ✅ Solo mostrar si no aceptó antes
    const accepted = localStorage.getItem("termsAccepted") === "1";
    if (!accepted) setOpen(true);
  }, []);

  const onAccept = () => {
    localStorage.setItem("termsAccepted", "1");
    setOpen(false);
  };

  const onReject = () => {
    // Opción A: cerrar (y que siga navegando)
    // setOpen(false);

    // Opción B (recomendada): bloquear acceso si rechaza
    // Puedes redirigir a otra página o dejarlo aquí:
    alert("Debes aceptar los términos para continuar.");
    // Si quieres mandarlo a otra ruta:
    // window.location.href = "/";
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Fondo oscuro */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={() => {}}
      />

      {/* Modal (modo blanco) */}
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        <div className="px-6 pt-6">
          <h2 className="text-xl font-black text-slate-900">
            Términos y condiciones
          </h2>
          <div className="mt-3 h-px w-full bg-slate-200" />
        </div>

        <div className="max-h-[60vh] overflow-auto px-6 py-4">
          <ol className="list-decimal space-y-3 pl-5 text-sm font-semibold text-slate-700">
            <li>
              Solo pueden participar personas naturales mayores de 18 años.
            </li>
            <li>
              Puedes participar desde cualquier parte del mundo, pero el premio
              debe ser retirado en Venezuela por un familiar o autorizado.
            </li>
            <li>
              Cada participante puede comprar uno o más tickets para aumentar
              sus oportunidades de ganar.
            </li>
            <li>
              El ganador se define con los resultados de la Lotería Súper Gana.
            </li>
            <li>
              Si el ganador no reclama su premio en 48 horas, se realizará un
              nuevo sorteo.
            </li>
            <li>
              Los premios en dinero se entregan mediante transferencia bancaria
              a tasa BCV.
            </li>
            <li>
              Los ganadores aceptan que su nombre, foto o video puedan ser
              publicados en nuestras redes.
            </li>
            <li>
              Los números premiados solo serán válidos hasta las 10:08 PM del
              día del sorteo.
            </li>
          </ol>
        </div>

        <div className="px-6 pb-6">
          <div className="h-px w-full bg-slate-200" />

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              onClick={onReject}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-900 hover:bg-slate-50"
            >
              Rechazar
            </button>

            <button
              onClick={onAccept}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
            >
              Aceptar <span className="ml-1">→</span>
            </button>
          </div>

          <p className="mt-3 text-xs font-semibold text-slate-500">
            Al aceptar, se guardará tu confirmación en este navegador.
          </p>
        </div>
      </div>
    </div>
  );
}
