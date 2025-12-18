"use client";

import React, { useEffect, useMemo, useState } from "react";

type TicketLot = {
  lotId: string; // id del documento o agrupación
  raffleTitle: string;
  raffleDate?: string;
  status: "pending" | "confirmed" | "rejected";
  quantity: number;
  totalAmount: number;
  ticketPrice: number;
  bank?: string;
  referenceNumber?: string;
  createdAt?: string;
  tickets?: number[]; // si tu API los devuelve
};

function normalizeCedula(raw: string) {
  const s = (raw || "").trim().toUpperCase();
  // permite V123 o V-123 o v 123
  const match = s.match(/^([VEJG])\s*-?\s*(\d{4,12})$/);
  if (!match) return "";
  return `${match[1]}${match[2]}`;
}

function StatusBadge({ status }: { status: TicketLot["status"] }) {
  const map = {
    confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    rejected: "bg-rose-100 text-rose-800 border-rose-200",
  }[status];
  const label = {
    confirmed: "Aprobado",
    pending: "Pendiente",
    rejected: "Rechazado",
  }[status];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black ${map}`}
    >
      {label}
    </span>
  );
}

export default function TicketsByCedulaClient({
  cedulaParam,
}: {
  cedulaParam: string;
}) {
  const cedulaNormalized = useMemo(
    () => normalizeCedula(decodeURIComponent(cedulaParam || "")),
    [cedulaParam]
  );

  const [cedula, setCedula] = useState(cedulaNormalized);
  const [lots, setLots] = useState<TicketLot[]>([]);
  const [selected, setSelected] = useState<TicketLot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function fetchLots(c: string) {
    setLoading(true);
    setError("");
    setSelected(null);

    try {
      const cc = c.charAt(0); // V
      const ci = c.slice(1); // 12345678

      const res = await fetch(`/api/tickets-by-cedula?cc=${cc}&ci=${ci}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setLots([]);
        setError(json?.error ?? "No se pudo cargar.");
        return;
      }

      setLots(json.lots ?? []);
    } catch (e: any) {
      setLots([]);
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!cedulaNormalized) {
      setError("Cédula inválida. Ej: V123123");
      return;
    }
    fetchLots(cedulaNormalized);
    setCedula(cedulaNormalized);
  }, [cedulaNormalized]);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header simple */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            {" "}
            <img src="/logo.png" alt="" width={100} />
            <div className="text-lg font-black text-slate-900">Mis boletos</div>
            <div className="text-xs font-bold text-slate-500">
              Consulta por cédula
            </div>
          </div>

          <a
            href="/"
            className="rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-900 hover:bg-slate-50"
          >
            Volver al inicio
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Buscador */}
        <div className="rounded-2xl bg-white p-5 shadow">
          <div className="text-sm font-black text-slate-900 mb-2">Cédula</div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-yellow-400"
              placeholder="Ej: V123123"
              value={cedula}
              onChange={(e) => setCedula(e.target.value.toUpperCase())}
            />
            <button
              className="rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 px-5 py-3 text-xs font-black text-slate-900 shadow hover:-translate-y-[1px] transition disabled:opacity-60"
              disabled={loading}
              onClick={() => {
                const n = normalizeCedula(cedula);
                if (!n) return setError("Cédula inválida. Ej: V123123");
                fetchLots(n);
              }}
            >
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>

          {error && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-800">
              {error}
            </div>
          )}
        </div>

        {/* Layout 2 columnas */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Lista de lotes */}
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-black text-slate-900">
                Lotes encontrados
              </div>
              <div className="text-xs font-black text-slate-500">
                {lots.length} lote(s)
              </div>
            </div>

            {loading ? (
              <div className="text-sm font-bold text-slate-500">
                Cargando...
              </div>
            ) : lots.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
                Aún no tienes compras aprobadas/registradas con esa cédula.
              </div>
            ) : (
              <div className="space-y-3">
                {lots.map((lot) => (
                  <button
                    key={lot.lotId}
                    onClick={() => setSelected(lot)}
                    className={`w-full rounded-2xl border-2 p-4 text-left transition
                      ${
                        selected?.lotId === lot.lotId
                          ? "border-yellow-400 bg-yellow-50"
                          : "border-slate-200 bg-white hover:border-yellow-400 hover:bg-yellow-50"
                      }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">
                          {lot.raffleTitle}
                        </div>
                        <div className="mt-1 text-xs font-bold text-slate-500">
                          {lot.raffleDate ? `📅 ${lot.raffleDate} · ` : ""}
                          Cantidad: {lot.quantity} · Total: Bs.{" "}
                          {Number(lot.totalAmount).toFixed(2)}
                        </div>
                      </div>
                      <StatusBadge status={lot.status} />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs font-black">
                      <span className="text-slate-500">ID</span>
                      <span className="text-slate-900">{lot.lotId}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detalle */}
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 text-sm font-black text-slate-900">
              Detalle del lote
            </div>

            {!selected ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
                Selecciona un lote para ver el detalle.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-black text-slate-900">
                    {selected.raffleTitle}
                  </div>
                  <StatusBadge status={selected.status} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-[11px] font-black text-slate-500">
                      Cédula
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      {cedulaNormalized || "-"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-[11px] font-black text-slate-500">
                      Cantidad
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      {selected.quantity}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-[11px] font-black text-slate-500">
                      Precio
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      Bs. {Number(selected.ticketPrice).toFixed(2)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-[11px] font-black text-slate-500">
                      Total
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      Bs. {Number(selected.totalAmount).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[11px] font-black text-slate-500">
                    Banco / Referencia
                  </div>
                  <div className="text-sm font-black text-slate-900">
                    {selected.bank ?? "-"} · {selected.referenceNumber ?? "-"}
                  </div>
                </div>

                {Array.isArray(selected.tickets) &&
                  selected.tickets.length > 0 && (
                    <div>
                      <div className="mb-2 text-xs font-black text-slate-500">
                        Tickets
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selected.tickets.map((t) => (
                          <span
                            key={t}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-900"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
