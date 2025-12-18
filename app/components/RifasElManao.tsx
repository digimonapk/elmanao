"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "./ui/Modal";
import { Copy, Check } from "lucide-react";
import TermsModal from "./TermsModal";
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
  const [customQuantity, setCustomQuantity] = useState(5);
  const [selectedPayment, setSelectedPayment] = useState("");
  const [qtyInput, setQtyInput] = useState<string>(String(customQuantity));

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
  function getStatusLabel(status: string) {
    switch (status) {
      case "pending":
        return "PENDIENTE";
      case "confirmed":
        return "CONFIRMADO";
      case "rejected":
        return "RECHAZADO";
      default:
        return String(status || "").toUpperCase();
    }
  }

  const [generatedTickets, setGeneratedTickets] = useState<string[]>([]);

  const [timeLeft, setTimeLeft] = useState({ days: 12, hours: 22, minutes: 0 });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function copyWithFeedback(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1200);
    } catch {
      // fallback básico si clipboard falla
      alert("No se pudo copiar. Copia manualmente.");
    }
  }

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
  const [selectedQuantity, setSelectedQuantity] = useState(5);

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
    // ✅ Snapshot de states (evita valores “a veces vacíos” por updates async)
    const fullName = (userData.fullName || "").trim();
    const userCountryCode = String(userData.cedula || "")
      .trim()
      .toUpperCase();
    const userIdNumber = String(userData.cedulaNumber || "")
      .trim()
      .replace(/\D/g, ""); // solo números

    const userPhone = (userData.phone || "").trim();
    const email = (userData.email || "").trim();
    const paymentMethod = (selectedPayment || "").trim();

    const referenceNumber = (reportData.reference || "").trim();
    const emitterPhone = `${reportData.phonePrefix || ""}${(
      reportData.phone || ""
    ).trim()}`;
    const proofFile = reportData.proofFile;

    // ✅ Validaciones (usuario)
    if (!fullName) return alert("Ingresa tu nombre completo.");
    if (!email) return alert("Ingresa tu correo.");
    if (!paymentMethod) return alert("Selecciona el método de pago.");

    if (!["V", "E", "J", "G"].includes(userCountryCode)) {
      return alert("Selecciona un tipo de documento válido (V/E/J/G).");
    }

    if (!userIdNumber) {
      return alert("Ingresa tu número de cédula (solo números).");
    }

    // ✅ Validaciones (reporte)
    if (!referenceNumber) return alert("Ingresa el número de referencia.");
    if (!emitterPhone.replace(/\D/g, ""))
      return alert("Ingresa el teléfono emisor.");
    if (!proofFile) return alert("Ingresa tu comprobante de pago.");

    // (opcional pero recomendado) validar tipo de archivo
    if (proofFile instanceof File && proofFile.size === 0) {
      return alert(
        "El archivo del comprobante está vacío. Vuelve a adjuntarlo."
      );
    }
    if (proofFile instanceof File && !proofFile.type.startsWith("image/")) {
      return alert("El comprobante debe ser una imagen (jpg/png/webp).");
    }

    setLoading(true);
    try {
      const fd = new FormData();

      // ✅ Datos usuario (comprador)
      fd.append("fullName", fullName);
      fd.append("userCountryCode", userCountryCode);
      fd.append("userIdNumber", userIdNumber);
      fd.append("userPhone", userPhone);
      fd.append("email", email);
      fd.append("paymentMethod", paymentMethod);

      // ✅ Datos compra
      fd.append("quantity", String(customQuantity));
      fd.append("totalAmount", String(total));
      fd.append("ticketPrice", String(currentRaffle.price));

      // ✅ Datos pago (reporte)
      fd.append("bank", "0102 (Banco de Venezuela)");
      fd.append("referenceNumber", referenceNumber);
      fd.append("emitterPhone", emitterPhone);

      // ✅ Comprobante
      // Nota: FormData.append acepta Blob/File. Si por alguna razón llega null, ya lo frenamos arriba.
      fd.append(
        "proofFile",
        proofFile instanceof File ? proofFile : (proofFile as any)
      );

      const res = await fetch("/api/payment-report", {
        method: "POST",
        body: fd,
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        // si el server devolvió HTML o vacío
      }

      if (!res.ok || !json?.ok) {
        const msg =
          json?.error || `Falló el reporte de pago (HTTP ${res.status}).`;
        alert(msg);
        return;
      }

      // ✅ tickets reales del backend
      const tickets = (json.tickets || []).map((t: any) => String(t));
      setGeneratedTickets(tickets);
      setStep("TICKETS");
    } catch (e: any) {
      alert(e?.message || "Error de red al enviar el reporte.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <TermsModal />{" "}
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

            <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-xl">
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
                    {/* Header BUY como la foto */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-black text-slate-900">
                        Comprar boletos
                      </div>
                      <button
                        className="h-9 w-9 rounded-full border border-slate-200 bg-white font-black text-slate-700 hover:bg-slate-50"
                        onClick={() => setStep("NONE")}
                        aria-label="Cerrar"
                      >
                        ✕
                      </button>
                    </div>

                    {/* ✅ En celular: 3 columnas como la imagen */}
                    <div className="grid grid-cols-3 gap-3">
                      {[5, 10, 20, 30, 50, 100].map((qty) => {
                        const selected = customQuantity === qty;
                        const popular = qty === 10;

                        return (
                          <button
                            key={qty}
                            onClick={() => {
                              setSelectedQuantity(qty);
                              setCustomQuantity(qty);
                            }}
                            className={`relative rounded-xl border p-4 text-center text-2xl font-black transition
              ${
                selected
                  ? "border-slate-300 bg-slate-200 text-slate-900"
                  : "border-slate-200 bg-white hover:border-yellow-400 hover:bg-yellow-50"
              }`}
                          >
                            {qty}

                            {popular && (
                              <div className="mt-1 text-[10px] font-black text-yellow-600">
                                Más popular
                              </div>
                            )}

                            {selected && (
                              <div className="mt-1 text-[10px] font-black text-slate-700">
                                Seleccionado
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Cantidad centrada */}
                    <div className="border-t border-slate-200" />

                    <div className="grid grid-cols-3 gap-3 items-center">
                      <button
                        className="h-12 rounded-xl border border-slate-200 bg-white text-xl font-black hover:bg-slate-50"
                        onClick={() => {
                          const next = Math.max(
                            5,
                            (Number(customQuantity) || 5) - 1
                          );
                          setCustomQuantity(next);
                          setQtyInput(String(next));
                        }}
                        aria-label="Disminuir"
                      >
                        −
                      </button>

                      <input
                        type="text"
                        inputMode="numeric"
                        value={qtyInput}
                        onChange={(e) => {
                          // ✅ deja escribir libre, solo filtra a dígitos
                          const v = e.target.value.replace(/[^\d]/g, "");
                          setQtyInput(v);
                        }}
                        onBlur={() => {
                          // ✅ aquí recién validas
                          const n = parseInt(qtyInput || "", 10);

                          if (!Number.isFinite(n)) {
                            setCustomQuantity(5);
                            setQtyInput("5");
                            return;
                          }

                          const fixed = Math.max(5, n);
                          setCustomQuantity(fixed);
                          setQtyInput(String(fixed));
                        }}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white text-center text-lg font-black text-slate-900 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200"
                        placeholder="5+"
                      />

                      <button
                        className="h-12 rounded-xl border border-slate-200 bg-white text-xl font-black hover:bg-slate-50"
                        onClick={() => {
                          const next = (Number(customQuantity) || 5) + 1;
                          setCustomQuantity(next);
                          setQtyInput(String(next));
                        }}
                        aria-label="Aumentar"
                      >
                        +
                      </button>
                    </div>

                    {/* Pagar */}
                    <button
                      className="w-full rounded-xl bg-yellow-400 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-900 hover:bg-yellow-500 transition"
                      onClick={() => setStep("PAY")}
                    >
                      Pagar Bs. {total.toFixed(2)}
                    </button>

                    {/* Limpiar todo */}
                    <button
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-900 hover:bg-slate-50 transition"
                      onClick={() => {
                        setSelectedQuantity(5);
                        setCustomQuantity(5);
                      }}
                    >
                      Limpiar todo
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
              Escribe el número de cédula que utilizaste para comprar tus
              boletos
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
                  className="text-base"
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
              <div className="text-xs font-bold text-red-600">
                {ticketsError}
              </div>
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
              Rifa:{" "}
              <span className="text-slate-900">CAMBIA TU VIDA #1.0 🔥</span>
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
                              : lot.status === "rejected"
                              ? "text-red-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {getStatusLabel(lot.status)}
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

              <div className="text-xs font-black text-slate-500">
                Tus boletos
              </div>

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
          <div className="space-y-6">
            {/* Resumen (como la foto: limpio, con separadores) */}
            <div className="space-y-3">
              <div className="flex items-start justify-between text-sm">
                <div className="text-slate-500 leading-tight">
                  Precio por <br /> boleto
                </div>
                <div className="font-semibold text-slate-900">
                  Bs. {currentRaffle.price.toFixed(2)}
                </div>
              </div>

              <div className="flex items-start justify-between text-sm">
                <div className="text-slate-500 leading-tight">
                  Cantidad de <br /> boletos
                </div>
                <div className="font-semibold text-slate-900">
                  {customQuantity}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-sm">
                <div className="text-slate-500">Total a pagar</div>
                <div className="font-semibold text-slate-900">
                  Bs. {total.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Título sección */}
            <div className="text-sm font-black text-slate-900">
              Elige el método de pago para continuar
            </div>

            {/* Métodos en L con más aire */}
            <div className="grid grid-cols-2 gap-4">
              {/* PAGO MÓVIL (ACTIVO) */}
              <button
                type="button"
                onClick={() => setSelectedPayment("pago-movil")}
                className={`relative rounded-xl border p-5 text-left transition bg-white
          ${
            selectedPayment === "pago-movil"
              ? "border-yellow-400"
              : "border-slate-200 hover:border-yellow-400"
          }`}
              >
                {/* radio arriba derecha */}
                <span
                  className={`absolute right-4 top-4 h-4 w-4 rounded-full border-2
            ${
              selectedPayment === "pago-movil"
                ? "border-yellow-400 bg-yellow-400"
                : "border-yellow-400"
            }`}
                />

                {/* icono simple como la foto */}
                <div className="text-yellow-500 text-2xl leading-none">📱</div>

                <div className="mt-3 text-sm font-black text-slate-900">
                  Pago móvil
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  Mínimo 5 boletos
                </div>
              </button>

              {/* BINANCE PAY (INHABILITADO) */}
              <div className="relative rounded-xl border border-slate-200 bg-white p-5 opacity-60">
                <span className="absolute right-4 top-4 h-4 w-4 rounded-full border-2 border-yellow-400" />

                <div className="text-yellow-500 text-2xl leading-none">🔸</div>

                <div className="mt-3 text-sm font-black text-slate-900">
                  Binance Pay
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  Mínimo 40 boletos
                </div>
              </div>

              {/* ZELLE (INHABILITADO) abajo izquierda */}
              <div className="relative rounded-xl border border-slate-200 bg-white p-5 opacity-60 col-span-1">
                <span className="absolute right-4 top-4 h-4 w-4 rounded-full border-2 border-yellow-400" />

                <div className="text-yellow-500 text-2xl leading-none">⚡</div>

                <div className="mt-3 text-sm font-black text-slate-900">
                  Zelle
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  Mínimo 40 boletos
                </div>
              </div>
            </div>

            {/* T&C como la foto (texto, link) */}
            <div className="pt-2 text-center text-xs font-semibold text-slate-600">
              Al presionar "Continuar" declaras haber leído y aceptado nuestros{" "}
              <a className="text-blue-600 font-black underline" href="#">
                Términos y condiciones
              </a>
              .
            </div>

            {/* Botones abajo con aire */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                className="h-12 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-900 hover:bg-slate-50 transition"
                onClick={() => setStep("BUY")}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={`h-12 rounded-xl text-sm font-black transition
          ${
            selectedPayment
              ? "bg-yellow-400 text-slate-900 hover:bg-yellow-500"
              : "bg-yellow-200 text-slate-500 cursor-not-allowed"
          }`}
                onClick={() => setStep("USER")}
                disabled={!selectedPayment}
              >
                Continuar
              </button>
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
                className="text-base"
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
                  className="text-base"
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
                className="text-base"
                value={userData.phone}
                onChange={(e: { target: { value: any } }) =>
                  setUserData({ ...userData, phone: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Correo comprador</Label>
              <Input
                className="text-base"
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
                  className="h-10 w-10 rounded-xl bg-yellow-400 flex items-center justify-center hover:bg-yellow-500 transition"
                  onClick={() => copyWithFeedback("amount", total.toFixed(2))}
                  aria-label="Copiar monto"
                >
                  <span
                    className={`transition-all duration-200 ${
                      copiedKey === "amount"
                        ? "scale-110 opacity-100"
                        : "scale-100 opacity-100"
                    }`}
                  >
                    {copiedKey === "amount" ? (
                      <Check className="h-5 w-5 text-slate-900 animate-[pop_180ms_ease-out]" />
                    ) : (
                      <Copy className="h-5 w-5 text-slate-900" />
                    )}
                  </span>
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
                      className="h-8 w-8 rounded-lg bg-slate-200 flex items-center justify-center hover:bg-slate-300 transition"
                      onClick={() =>
                        copyWithFeedback(`row-${row.label}`, row.value)
                      }
                      aria-label={`Copiar ${row.label}`}
                    >
                      {copiedKey === `row-${row.label}` ? (
                        <Check className="h-4 w-4 text-slate-700 animate-[pop_180ms_ease-out]" />
                      ) : (
                        <Copy className="h-4 w-4 text-slate-700" />
                      )}
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
                  className="text-base"
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
                    setReportData({
                      ...reportData,
                      phonePrefix: e.target.value,
                    })
                  }
                >
                  {["0414", "0424", "0412", "0416", "0426"].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>

                <Input
                  className="text-base"
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
      </div>{" "}
    </>
  );
}
