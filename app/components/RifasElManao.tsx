"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "./ui/Modal";
import {
  Input,
  Label,
  PrimaryButton,
  SecondaryButton,
  Select,
} from "./ui/Field";

type Step = "NONE" | "BUY" | "PAY" | "USER" | "CONFIRM" | "REPORT" | "TICKETS";
const REPORT_TIME_SECONDS = 10 * 60; // 10 minutos

export default function RifasElManao() {
  const [step, setStep] = useState<Step>("NONE");
  const [selectedQuantity, setSelectedQuantity] = useState(2);
  const [customQuantity, setCustomQuantity] = useState(2);
  const [selectedPayment, setSelectedPayment] = useState("");

  const [loading, setLoading] = useState(false);

  const [userData, setUserData] = useState({
    fullName: "",
    cedula: "V",
    cedulaNumber: "",
    phone: "",
    email: "",
  });

  const [reportData, setReportData] = useState({
    reference: "",
    phonePrefix: "0414",
    phone: "",
    proofFile: null as File | null,
  });
  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  const [generatedTickets, setGeneratedTickets] = useState<string[]>([]);

  const [timeLeft, setTimeLeft] = useState({ days: 12, hours: 22, minutes: 0 });

  const currentRaffle = useMemo(
    () => ({
      title: "CAMBIA TU VIDA #1.0",
      date: "30/12/2025",
      price: 150.0,
      totalTickets: 1000,
      soldTickets: 761,
    }),
    []
  );
  type TicketsLot = {
    lotId: string;
    createdAt: string;
    status: string;
    quantity: number;
    totalAmount: number;
    tickets: string[];
  };

  const [showTicketsModal, setShowTicketsModal] = useState(false);
  const [showLotsModal, setShowLotsModal] = useState(false);
  const [showLotDetail, setShowLotDetail] = useState<TicketsLot | null>(null);

  const [cedulaForm, setCedulaForm] = useState({
    cc: "V",
    ci: "",
  });
  const [reportSecondsLeft, setReportSecondsLeft] = useState<number | null>(
    null
  );

  const [loadingTickets, setLoadingTickets] = useState(false);
  const [lots, setLots] = useState<TicketsLot[]>([]);
  const [ticketsError, setTicketsError] = useState("");

  const previousRaffles = useMemo(
    () => [
      { id: 59, prize: "$1,200", tag: "RIFAS GANA FÁCIL", img: "2.jpeg" },
      { id: 58, prize: "$1,000", tag: "RIFAS GANA FÁCIL", img: "3.jpeg" },
      { id: 57, prize: "$1,500", tag: "RIFAS GANA FÁCIL", img: "4.jpeg" },
      { id: 56, prize: "$3,000", tag: "RIFAS GANA FÁCIL", img: "5.jpeg" },
      { id: 55, prize: "$1,500", tag: "RIFAS GANA FÁCIL", img: "6.jpeg" },
      { id: 54, prize: "$2,000", tag: "RIFAS GANA FÁCIL", img: "7.jpeg" },
    ],
    []
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1 };
        if (prev.hours > 0)
          return { ...prev, hours: prev.hours - 1, minutes: 59 };
        if (prev.days > 0)
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59 };
        return prev;
      });
    }, 60000);

    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (step !== "CONFIRM" || reportSecondsLeft === null) return;

    if (reportSecondsLeft <= 0) return;

    const interval = setInterval(() => {
      setReportSecondsLeft((prev) => (prev !== null ? prev - 1 : prev));
    }, 1000);

    return () => clearInterval(interval);
  }, [step, reportSecondsLeft]);

  const total = currentRaffle.price * customQuantity;
  const progress =
    (currentRaffle.soldTickets / currentRaffle.totalTickets) * 100;

  const resetAll = () => {
    setStep("NONE");
    setSelectedQuantity(2);
    setCustomQuantity(2);
    setSelectedPayment("");
    setUserData({
      fullName: "",
      cedula: "V",
      cedulaNumber: "",
      phone: "",
      email: "",
    });
    setReportData({
      reference: "",
      phonePrefix: "0414",
      phone: "",
      proofFile: null,
    });
    setGeneratedTickets([]);
    setLoading(false);
  };

  const generateTickets = (qty: number) =>
    Array.from({ length: qty }, () =>
      Math.floor(100000 + Math.random() * 900000).toString()
    );

  // ✅ 1) Crear orden en backend (cuando el usuario confirma sus datos)
  async function createOrder() {
    setLoading(true);
    try {
      const res = await fetch("/api/payment-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: userData.fullName,
          idCountryCode: userData.cedula,
          idNumber: userData.cedulaNumber,
          phone: userData.phone,
          email: userData.email,
          quantity: customQuantity,
          paymentMethod: selectedPayment,
          total,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        alert(json?.error ?? "No se pudo crear la orden.");
        return;
      }

      setStep("CONFIRM");
    } finally {
      setLoading(false);
    }
  }

  // ✅ 2) Reportar pago con FormData (archivo)
  async function reportPayment() {
    if (!reportData.reference.trim())
      return alert("Ingresa el número de referencia.");
    if (!reportData.phone.trim()) return alert("Ingresa el teléfono emisor.");
    if (!reportData.proofFile) return alert("Ingresa tu comprobante de pago.");

    setLoading(true);
    try {
      const fd = new FormData();

      // ✅ Datos usuario (comprador)
      fd.append("fullName", userData.fullName.trim());
      fd.append("userCountryCode", userData.cedula);
      fd.append("userIdNumber", userData.cedulaNumber.trim());
      fd.append("userPhone", userData.phone.trim());
      fd.append("email", userData.email.trim());
      fd.append("paymentMethod", selectedPayment);

      // ✅ Datos compra
      fd.append("quantity", String(customQuantity));
      fd.append("totalAmount", String(total));
      fd.append("ticketPrice", String(currentRaffle.price));

      // ✅ Datos pago (reporte)
      fd.append("bank", "0102 (Banco de Venezuela)"); // 👈 si lo quieres dinámico, lo pasamos a state
      fd.append("referenceNumber", reportData.reference.trim());

      // opcional: guardar teléfono emisor (si tu backend lo acepta)
      fd.append(
        "emitterPhone",
        `${reportData.phonePrefix}${reportData.phone.trim()}`
      );

      // ✅ Comprobante
      fd.append("proofFile", reportData.proofFile);

      const res = await fetch("/api/payment-report", {
        method: "POST",
        body: fd,
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        alert(json?.error ?? "Falló el reporte de pago.");
        return;
      }

      // ✅ tickets reales del backend
      const tickets = (json.tickets || []).map((t: any) => String(t));
      setGeneratedTickets(tickets);

      setStep("TICKETS");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 shadow">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="w-24" />
          <div className="flex items-center gap-3">
            <div className="leading-tight">
              <img src="logo.png" alt="" width={100} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-10 w-10 rounded-full bg-black/10 hover:bg-black/20">
              🌙
            </button>
            <button className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-black text-white shadow hover:bg-emerald-600">
              WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-3 px-4 py-3">
          <span className="text-yellow-500">⏱️</span>
          <span className="text-xs font-black text-slate-500">
            Estás a tiempo
          </span>
          <div className="flex items-center gap-2 text-xs font-black text-slate-900">
            <span>{timeLeft.days} D</span>
            <span className="text-slate-300">:</span>
            <span>{timeLeft.hours} H</span>
            <span className="text-slate-300">:</span>
            <span>{String(timeLeft.minutes).padStart(2, "0")} M</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
            <img
              className="h-[360px] w-full object-cover"
              src="1.png"
              alt="Premio"
            />
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-xl">
            <h1 className="mb-4 text-2xl font-black text-slate-900">
              {currentRaffle.title} <span>🔥</span>
            </h1>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="mb-1 text-[11px] font-black text-slate-500">
                  Sorteo
                </div>
                <div className="text-sm font-black text-slate-900">
                  {currentRaffle.date}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="mb-1 text-[11px] font-black text-slate-500">
                  Boleto
                </div>
                <div className="text-sm font-black text-slate-900">
                  Bs. {currentRaffle.price.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {/* ✅ Si NO estás en BUY, muestra los 2 botones */}
              {step !== "BUY" && (
                <>
                  <button
                    className="w-full rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-900 shadow-lg shadow-yellow-500/25 hover:-translate-y-[1px] transition"
                    onClick={() => setStep("BUY")}
                  >
                    Comprar boletos
                  </button>

                  <button
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-900 hover:bg-yellow-50 hover:border-yellow-400 transition"
                    onClick={() => {
                      setCedulaForm({ cc: "V", ci: "" });
                      setTicketsError("");
                      setShowTicketsModal(true);
                    }}
                  >
                    Ver boletos comprados
                  </button>
                </>
              )}

              {/* ✅ Si estás en BUY, muestra el selector inline */}
              {step === "BUY" && (
                <div className="mt-2 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[2, 5, 10, 20, 30, 50].map((qty) => {
                      const selected = selectedQuantity === qty;
                      const popular = qty === 5;

                      return (
                        <button
                          key={qty}
                          onClick={() => {
                            setSelectedQuantity(qty);
                            setCustomQuantity(qty);
                          }}
                          className={`relative rounded-xl border-2 p-6 text-center text-3xl font-black transition
                ${
                  selected
                    ? "border-yellow-400 bg-yellow-50"
                    : "border-slate-200 bg-white hover:border-yellow-400 hover:bg-yellow-50"
                }`}
                        >
                          {qty}
                          {popular && (
                            <span className="absolute left-1/2 -translate-x-1/2 bottom-3 text-[11px] font-black text-yellow-600">
                              Más popular
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-center text-sm font-black text-slate-900">
                    {customQuantity}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className="h-12 rounded-xl border-2 border-slate-200 bg-white font-black hover:border-yellow-400 hover:bg-yellow-50"
                      onClick={() =>
                        setCustomQuantity((q) => Math.max(1, q - 1))
                      }
                    >
                      −
                    </button>
                    <button
                      className="h-12 rounded-xl border-2 border-slate-200 bg-white font-black hover:border-yellow-400 hover:bg-yellow-50"
                      onClick={() => setCustomQuantity((q) => q + 1)}
                    >
                      +
                    </button>
                  </div>

                  {/* ✅ Pagar abre el overlay */}
                  <button
                    className="w-full rounded-xl bg-yellow-400 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-900 hover:bg-yellow-500 transition"
                    onClick={() => setStep("PAY")}
                  >
                    Pagar Bs. {total.toFixed(2)}
                  </button>

                  <button
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-900 hover:bg-slate-50 transition"
                    onClick={() => {
                      setSelectedQuantity(2);
                      setCustomQuantity(2);
                      setStep("NONE"); // ✅ vuelve a mostrar los 2 botones
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            <div className="mt-5 border-t pt-5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-xs font-black text-slate-500">
                Queda un {progress.toFixed(2)}% de los boletos
              </div>
            </div>
          </div>
        </div>

        <h2 className="mt-10 mb-4 text-lg font-black text-slate-900">
          Echa un vistazo a nuestros últimos sorteos
        </h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {previousRaffles.map((r) => (
            <div
              key={r.id}
              className="overflow-hidden rounded-2xl bg-white shadow-lg hover:-translate-y-[2px] transition"
            >
              <div className="relative h-56">
                <img
                  className="h-full w-full object-cover"
                  src={`${r.img}`}
                  alt={`Sorteo ${r.id}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                <div className="absolute bottom-3 left-24 text-xs font-black text-white/90">
                  <div>{r.tag}</div>
                  <div className="text-white/70">premiados</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ✅ ONE MODAL (steps) */}
      <Modal
        open={showTicketsModal}
        title="Ver mis boletos comprados"
        onClose={() => setShowTicketsModal(false)}
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs font-semibold text-slate-500">
            Escribe el número de cédula que utilizaste para comprar tus boletos
          </p>

          <div>
            <Label>Cédula</Label>
            <div className="flex gap-2">
              <Select
                className="w-24"
                value={cedulaForm.cc}
                onChange={(e) =>
                  setCedulaForm({ ...cedulaForm, cc: e.target.value })
                }
              >
                <option value="V">V</option>
                <option value="E">E</option>
                <option value="J">J</option>
                <option value="G">G</option>
              </Select>

              <Input
                placeholder="00000000"
                value={cedulaForm.ci}
                onChange={(e) =>
                  setCedulaForm({
                    ...cedulaForm,
                    ci: e.target.value.replace(/\D/g, ""),
                  })
                }
              />
            </div>
          </div>

          {ticketsError && (
            <div className="text-xs font-bold text-red-600">{ticketsError}</div>
          )}

          <PrimaryButton
            disabled={!cedulaForm.ci || loadingTickets}
            onClick={async () => {
              setLoadingTickets(true);
              setTicketsError("");

              try {
                const res = await fetch(
                  `/api/tickets-by-cedula?cc=${cedulaForm.cc}&ci=${cedulaForm.ci}`
                );
                const json = await res.json();

                if (!res.ok || !json.ok) {
                  setTicketsError(json?.error || "No se encontraron boletos");
                  return;
                }

                setLots(json.lots || []);
                setShowTicketsModal(false);
                setShowLotsModal(true);
              } finally {
                setLoadingTickets(false);
              }
            }}
          >
            {loadingTickets ? "Buscando..." : "Ver boletos"}
          </PrimaryButton>
        </div>
      </Modal>

      <Modal
        open={showLotsModal}
        title="Boletos comprados"
        onClose={() => setShowLotsModal(false)}
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-500">
            Rifa: <span className="text-slate-900">CAMBIA TU VIDA #1.0 🔥</span>
          </div>

          {lots.length === 0 ? (
            <div className="text-sm font-semibold text-slate-500">
              Aún no tienes compras aprobadas en esta rifa
            </div>
          ) : (
            <div className="space-y-3">
              {lots.map((lot) => (
                <button
                  key={lot.lotId}
                  onClick={() => setShowLotDetail(lot)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-yellow-400 hover:bg-yellow-50 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900">
                        {lot.quantity} boletos
                      </div>

                      <div className="mt-1 text-xs font-bold text-slate-500">
                        {new Date(lot.createdAt).toLocaleDateString()}
                      </div>

                      {/* ✅ Hint */}
                      <div className="mt-2 text-[11px] font-black text-slate-400">
                        Click para mayor información
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-slate-900">
                        Bs. {lot.totalAmount}
                      </div>

                      <div
                        className={`mt-1 text-xs font-black ${
                          lot.status === "confirmed"
                            ? "text-emerald-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {lot.status.toUpperCase()}
                      </div>

                      {/* ✅ Flecha visual */}
                      <div className="mt-3 text-slate-400 font-black">›</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={!!showLotDetail}
        title="Detalle de compra"
        onClose={() => setShowLotDetail(null)}
        maxWidthClass="max-w-lg"
      >
        {showLotDetail && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 text-sm font-bold">
              <div className="flex justify-between">
                <span>Cantidad</span>
                <span>{showLotDetail.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span>Total</span>
                <span>Bs. {showLotDetail.totalAmount}</span>
              </div>
              <div className="flex justify-between">
                <span>Estado</span>
                <span className="uppercase">{showLotDetail.status}</span>
              </div>
            </div>

            <div className="text-xs font-black text-slate-500">Tus boletos</div>

            <div className="flex flex-wrap gap-2">
              {showLotDetail.tickets.map((t) => (
                <div
                  key={t}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-900"
                >
                  {t}
                </div>
              ))}
            </div>

            <PrimaryButton onClick={() => setShowLotDetail(null)}>
              Volver
            </PrimaryButton>
          </div>
        )}
      </Modal>

      {/* PAY */}
      <Modal
        open={step === "PAY"}
        title="¿Cómo quieres pagar?"
        onClose={() => setStep("NONE")}
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex justify-between text-sm font-bold text-slate-600">
              <span>Precio por boleto</span>
              <span className="text-slate-900">
                Bs. {currentRaffle.price.toFixed(2)}
              </span>
            </div>
            <div className="mt-2 flex justify-between text-sm font-bold text-slate-600">
              <span>Cantidad</span>
              <span className="text-slate-900">{customQuantity}</span>
            </div>
            <div className="mt-3 border-t pt-3 flex justify-between text-sm font-black">
              <span>Total</span>
              <span>Bs. {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* PAGO MÓVIL (ACTIVO) */}
            <button
              onClick={() => setSelectedPayment("pago-movil")}
              className={`relative rounded-xl border-2 p-4 text-left transition flex items-center gap-3
      ${
        selectedPayment === "pago-movil"
          ? "border-yellow-400 bg-yellow-50"
          : "border-slate-200 bg-white hover:border-yellow-400 hover:bg-yellow-50"
      }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-400 text-lg font-black">
                📱
              </div>

              <div className="flex-1">
                <div className="text-sm font-black text-slate-900">
                  Pago móvil
                </div>
                <div className="text-xs font-bold text-slate-500">
                  Mínimo 2 boletos
                </div>
              </div>

              <div
                className={`h-5 w-5 rounded-full border-2
        ${
          selectedPayment === "pago-movil"
            ? "border-yellow-400 bg-yellow-400"
            : "border-slate-300"
        }`}
              />
            </button>

            {/* BINANCE PAY (DESHABILITADO) */}
            <div className="relative rounded-xl border-2 border-slate-200 bg-slate-50 p-4 flex items-center gap-3 opacity-60 cursor-not-allowed">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-300 text-lg font-black">
                ₿
              </div>

              <div className="flex-1">
                <div className="text-sm font-black text-slate-600">
                  Binance Pay
                </div>
                <div className="text-xs font-bold text-slate-400">
                  Mínimo 40 boletos
                </div>
              </div>

              <div className="h-5 w-5 rounded-full border-2 border-slate-300" />
            </div>

            {/* ZELLE (DESHABILITADO, ABAJO IZQUIERDA) */}
            <div className="relative rounded-xl border-2 border-slate-200 bg-slate-50 p-4 flex items-center gap-3 opacity-60 cursor-not-allowed col-span-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-300 text-lg font-black">
                $
              </div>

              <div className="flex-1">
                <div className="text-sm font-black text-slate-600">Zelle</div>
                <div className="text-xs font-bold text-slate-400">
                  Mínimo 40 boletos
                </div>
              </div>

              <div className="h-5 w-5 rounded-full border-2 border-slate-300" />
            </div>
          </div>

          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-xs font-bold text-yellow-900">
            Al continuar aceptas Términos y condiciones.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SecondaryButton full onClick={() => setStep("BUY")}>
              Volver
            </SecondaryButton>
            <PrimaryButton
              full
              onClick={() => setStep("USER")}
              disabled={!selectedPayment}
            >
              Continuar
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      {/* USER */}
      <Modal
        open={step === "USER"}
        title="Indica tus datos"
        onClose={() => setStep("NONE")}
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <div>
            <Label>Nombre completo</Label>
            <Input
              value={userData.fullName}
              onChange={(e: { target: { value: any } }) =>
                setUserData({ ...userData, fullName: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Cédula</Label>
            <div className="flex gap-2">
              <Select
                className="w-24"
                value={userData.cedula}
                onChange={(e: { target: { value: any } }) =>
                  setUserData({ ...userData, cedula: e.target.value })
                }
              >
                <option value="V">V</option>
                <option value="E">E</option>
                <option value="J">J</option>
                <option value="G">G</option>
              </Select>
              <Input
                value={userData.cedulaNumber}
                onChange={(e: { target: { value: any } }) =>
                  setUserData({ ...userData, cedulaNumber: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <Label>Teléfono</Label>
            <Input
              value={userData.phone}
              onChange={(e: { target: { value: any } }) =>
                setUserData({ ...userData, phone: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Correo comprador</Label>
            <Input
              type="email"
              value={userData.email}
              onChange={(e: { target: { value: any } }) =>
                setUserData({ ...userData, email: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SecondaryButton full onClick={() => setStep("PAY")}>
              Volver
            </SecondaryButton>

            <PrimaryButton
              full
              disabled={
                loading ||
                !userData.fullName ||
                !userData.cedulaNumber ||
                !userData.phone ||
                !userData.email ||
                !selectedPayment
              }
              onClick={() => {
                setReportSecondsLeft(REPORT_TIME_SECONDS);
                setStep("CONFIRM");
              }}
            >
              {loading ? "Creando..." : "Pagar"}
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      {/* CONFIRM */}
      <Modal
        open={step === "CONFIRM"}
        title="Realiza el pago"
        onClose={() => setStep("NONE")}
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-600">
            Una vez realices el pago, reporta el comprobante.
          </p>

          <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs font-black text-yellow-900 inline-flex items-center gap-2">
            ⏱️ Tiempo para reportar:
            <span className="font-black">
              {reportSecondsLeft !== null
                ? formatTime(reportSecondsLeft)
                : "10:00"}
            </span>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs font-black text-slate-500 mb-2">
              Monto exacto
            </div>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-black text-slate-900">
                Bs. {total.toFixed(2)}
              </div>
              <button
                className="rounded-xl bg-yellow-400 px-3 py-2 text-xs font-black"
                onClick={() => navigator.clipboard.writeText(total.toFixed(2))}
              >
                Copiar
              </button>
            </div>
          </div>

          {/* datos banco (puedes hacerlos dinámicos por método luego) */}
          <div className="space-y-2">
            {[
              { label: "Banco", value: "0102 (Banco de Venezuela)" },
              { label: "Cédula", value: "J30471053" },
              { label: "Teléfono", value: "04121897013" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3"
              >
                <div className="text-xs font-black text-slate-500">
                  {row.label}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs font-black text-slate-900">
                    {row.value}
                  </div>
                  <button
                    className="rounded-lg bg-slate-200 px-2 py-1 text-xs font-black"
                    onClick={() => navigator.clipboard.writeText(row.value)}
                  >
                    Copiar
                  </button>
                </div>
              </div>
            ))}
          </div>

          <PrimaryButton onClick={() => setStep("REPORT")}>
            Reportar pago
          </PrimaryButton>
        </div>
      </Modal>

      {/* REPORT */}
      <Modal
        open={step === "REPORT"}
        title="Detalla el pago que realizaste"
        onClose={() => setStep("NONE")}
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-xs font-bold text-yellow-900">
            Tienes 10 minutos para reportar el pago o se cancela.
          </div>

          <div>
            <Label>Número de referencia</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ej: 1234567890"
                value={reportData.reference}
                onChange={(e: { target: { value: any } }) =>
                  setReportData({ ...reportData, reference: e.target.value })
                }
              />
              <SecondaryButton
                full={false}
                className="min-w-[92px]"
                onClick={async () => {
                  const txt = await navigator.clipboard
                    .readText()
                    .catch(() => "");
                  if (txt) setReportData((p) => ({ ...p, reference: txt }));
                }}
              >
                Pegar
              </SecondaryButton>
            </div>
          </div>

          <div>
            <Label>Teléfono emisor</Label>
            <div className="flex gap-2">
              <Select
                className="w-28"
                value={reportData.phonePrefix}
                onChange={(e: { target: { value: any } }) =>
                  setReportData({ ...reportData, phonePrefix: e.target.value })
                }
              >
                {["0414", "0424", "0412", "0416", "0426"].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>

              <Input
                placeholder="Ej: 1234567"
                value={reportData.phone}
                onChange={(e: { target: { value: string } }) =>
                  setReportData({
                    ...reportData,
                    phone: e.target.value.replace(/\D/g, ""),
                  })
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-black text-slate-900">
              Cargar comprobante
            </div>
            <div className="mt-1 text-xs font-bold text-slate-500">
              PNG, JPG hasta 2MB
            </div>

            <label className="mt-3 block cursor-pointer">
              <div className="rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 px-4 py-3 text-center text-xs font-black text-slate-900 shadow-lg shadow-yellow-500/25 hover:-translate-y-[1px] transition">
                Subir imagen
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) =>
                  setReportData({
                    ...reportData,
                    proofFile: e.target.files?.[0] ?? null,
                  })
                }
              />
            </label>

            {reportData.proofFile && (
              <div className="mt-3 text-xs font-black text-emerald-600">
                ✅ {reportData.proofFile.name}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SecondaryButton full onClick={() => setStep("CONFIRM")}>
              Volver
            </SecondaryButton>

            <PrimaryButton full onClick={reportPayment} disabled={loading}>
              {loading ? "Enviando..." : "Confirmar compra"}
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      {/* TICKETS */}
      <Modal
        open={step === "TICKETS"}
        title="Boletos"
        onClose={resetAll}
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <div className="mx-auto inline-flex rounded-full border border-yellow-200 bg-yellow-50 px-4 py-2 text-xs font-black text-yellow-900">
            📅 {currentRaffle.date}
          </div>

          <div className="text-center text-sm font-black text-slate-900">
            {currentRaffle.title} 🔥
          </div>

          <p className="text-center text-xs font-bold text-slate-500">
            Estamos comprobando tu pago. En caso de ser aprobado tus boletos
            serán activados.
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {generatedTickets.map((t) => (
              <div
                key={t}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-900"
              >
                {t}
              </div>
            ))}
          </div>

          <PrimaryButton onClick={resetAll}>Ir al inicio</PrimaryButton>
        </div>
      </Modal>
    </div>
  );
}
