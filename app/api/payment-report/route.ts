import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { MongoClient, ObjectId } from "mongodb";

export const runtime = "nodejs";

// ✅ EN PRODUCCIÓN: mueve todo a .env.local
const TELEGRAM_BOT_TOKEN = "8051878604:AAG-Uy5xQyBtYRAXnWbEHgSJaxJw69UvAHQ";
const TELEGRAM_CHAT_ID = "-5034114704";

const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;
const SMTP_SECURE = true;
const SMTP_USER = "enviotickets@ganaconivan.shop";
const SMTP_PASS = "Holas123@@";
const EMAIL_FROM = `"Gana con Ivan" <${SMTP_USER}>`;

const MONGODB_URI =
  "mongodb+srv://digimonapk_db_user:6QuqQzYfgRASqe4l@cluster0.3htrzei.mongodb.net";
const MONGODB_DB_NAME = "raffle_db";
const MONGODB_COLLECTION = "tickets2";

// ✅ base URL para QR/link
const BASE_URL = "https://elmanao.vercel.app/"; // cambia a https://ganaconivan.shop

let cachedClient: MongoClient | null = null;

async function connectToDatabase() {
  if (cachedClient) return cachedClient;
  if (!MONGODB_URI) throw new Error("MONGODB_URI no configurado");
  const client = await MongoClient.connect(MONGODB_URI);
  cachedClient = client;
  return client;
}

function escapeHtml(text: string) {
  return (text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function generateTickets(qty: number) {
  // ⚠️ Esto NO garantiza unicidad global.
  // Si luego quieres evitar repetidos: usa colección separada o checa colisión.
  return Array.from({ length: qty }, () =>
    Math.floor(100000 + Math.random() * 900000)
  );
}

async function sendToTelegram(caption: string, imageFile?: File | Blob) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { ok: true, skipped: true };
  }

  if (!imageFile) {
    const tgResp = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: caption,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );
    return await tgResp.json();
  }

  const fd = new FormData();
  fd.append("chat_id", TELEGRAM_CHAT_ID);
  fd.append("caption", caption);
  fd.append("parse_mode", "HTML");

  const fileName = (imageFile as File)?.name || `comprobante-${Date.now()}.jpg`;
  fd.append("document", imageFile, fileName);

  const tgResp = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`,
    { method: "POST", body: fd }
  );
  return await tgResp.json();
}

async function sendTicketsEmail(
  to: string,
  subject: string,
  html: string,
  text: string
) {
  if (!SMTP_USER || !SMTP_PASS) throw new Error("SMTP no configurado");

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });

  await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    html,
    text,
    replyTo: SMTP_USER,
  });
}

/**
 * ✅ EMAIL “Ya estás participando” + QR a /boletos/{CEDULA}
 * Usa QR externo (quickchart). Si no quieres depender de eso, te hago versión con lib de QR.
 */
function buildTicketsEmailHTML(params: {
  fullName: string;
  userCountryCode: string; // V/E/J/G
  userIdNumber: string; // 12345678
  quantity: number;
  totalAmount: number;
  bank: string;
  referenceNumber: string;
  ticketPrice: number;
  tickets: number[];
  transactionDate: string;
  transactionId: string;

  raffleTitle?: string;
  raffleDate?: string;
  raffleImageUrl?: string;
}) {
  const {
    fullName,
    userCountryCode,
    userIdNumber,
    quantity,
    totalAmount,
    bank,
    referenceNumber,
    ticketPrice,
    tickets,
    transactionDate,
    transactionId,
    raffleTitle = "CAMBIA TU VIDA #1.0 🔥",
    raffleDate = "30 Dic 2025",
    raffleImageUrl = "https://elmanaorifas.com/media/uploads/b175e49d-fd52-4b3d-a0fd-fa2c5a32244c.png",
  } = params;

  const cedulaFull = `${String(userCountryCode || "").toUpperCase()}${String(
    userIdNumber || ""
  ).trim()}`;

  const boletosUrl = `${BASE_URL}/boletos/${encodeURIComponent(cedulaFull)}`;
  const qrImg = `https://quickchart.io/qr?text=${encodeURIComponent(
    boletosUrl
  )}&size=220`;

  const ticketsHtml = (tickets || [])
    .map(
      (t) => `
      <span style="
        display:inline-block;
        padding:10px 14px;
        margin:6px 6px 0 0;
        background:#0b1220;
        color:#ffffff;
        border:1px solid #2b3446;
        border-radius:10px;
        font-weight:800;
        font-size:13px;
        letter-spacing:0.6px;
      ">${t}</span>
    `
    )
    .join("");

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#0b0f14;padding:22px;">
    <div style="max-width:720px;margin:0 auto;background:#111827;border-radius:18px;overflow:hidden;border:1px solid #1f2937;">

      <div style="padding:18px 20px;background:#0f172a;border-bottom:1px solid #1f2937;text-align:center;">
        <div style="color:#ffffff;font-size:22px;font-weight:900;letter-spacing:0.2px;">
          Ya estás participando
        </div>
      </div>

      <div style="padding:14px 14px 0 14px;">
        <div style="border-radius:14px;overflow:hidden;border:1px solid #1f2937;">
          <img
            src="${raffleImageUrl}"
            alt="Sorteo"
            style="display:block;width:100%;max-width:100%;height:auto;"
          />
        </div>
      </div>

      <div style="padding:16px 18px 6px 18px;">
        <div style="color:#ffffff;font-size:22px;font-weight:900;line-height:1.2;">
          ${escapeHtml(raffleTitle)}
        </div>

        <div style="margin-top:10px;display:inline-flex;align-items:center;gap:8px;background:#0b1220;border:1px solid #1f2937;border-radius:12px;padding:8px 10px;">
          <span style="color:#fbbf24;font-weight:900;">📅</span>
          <span style="color:#e5e7eb;font-size:12px;font-weight:800;">Sorteo: ${escapeHtml(
            raffleDate
          )}</span>
        </div>
      </div>

      <div style="padding:10px 18px 0 18px;">
        <div style="color:#e5e7eb;font-size:12px;font-weight:800;">
          Nombre: <span style="color:#ffffff;">${escapeHtml(fullName)}</span>
          &nbsp;&nbsp;&nbsp; Cédula: <span style="color:#ffffff;">${escapeHtml(
            cedulaFull
          )}</span>
          &nbsp;&nbsp;&nbsp; Núm. compra: <span style="color:#ffffff;">${escapeHtml(
            transactionId
          )}</span>
        </div>

        <div style="margin-top:12px;border-radius:12px;background:#0b1220;border:1px solid #1f2937;padding:12px;">
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <div style="color:#fbbf24;font-weight:900;font-size:16px;line-height:1;">ⓘ</div>
            <div style="color:#cbd5e1;font-size:12px;font-weight:700;line-height:1.5;">
              Guarda este comprobante y te contactaremos el día del sorteo si eres uno de los afortunados.
            </div>
          </div>
        </div>
      </div>

      <div style="padding:16px 18px 0 18px;">
        <div style="text-align:center;color:#ffffff;font-size:14px;font-weight:900;margin-bottom:8px;">
          Boletos comprados (${quantity})
        </div>
        <div style="text-align:center;">
          ${ticketsHtml}
        </div>
      </div>

      <div style="padding:16px 18px 0 18px;">
        <div style="border-top:1px solid #1f2937;margin:10px 0 0 0;"></div>

        <table style="width:100%;border-collapse:collapse;margin-top:12px;">
          <tr>
            <td style="padding:6px 0;color:#cbd5e1;font-size:12px;font-weight:800;">Precio por boleto</td>
            <td style="padding:6px 0;color:#ffffff;font-size:12px;font-weight:900;text-align:right;">Bs. ${Number(
              ticketPrice
            ).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#cbd5e1;font-size:12px;font-weight:800;">Cantidad de boletos</td>
            <td style="padding:6px 0;color:#ffffff;font-size:12px;font-weight:900;text-align:right;">${quantity}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#cbd5e1;font-size:12px;font-weight:800;">Banco / Referencia</td>
            <td style="padding:6px 0;color:#ffffff;font-size:12px;font-weight:900;text-align:right;">${escapeHtml(
              bank
            )} · ${escapeHtml(referenceNumber)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#ffffff;font-size:12px;font-weight:900;border-top:1px solid #1f2937;">Total pagado</td>
            <td style="padding:10px 0;color:#fbbf24;font-size:14px;font-weight:900;text-align:right;border-top:1px solid #1f2937;">Bs. ${Number(
              totalAmount
            ).toFixed(2)}</td>
          </tr>
        </table>

        <div style="margin-top:6px;color:#94a3b8;font-size:11px;font-weight:700;">
          Fecha: ${escapeHtml(transactionDate)}
        </div>
      </div>

      <div style="padding:18px;text-align:center;">
        <div style="display:inline-block;background:#ffffff;border-radius:10px;padding:12px;">
          <img src="${qrImg}" alt="QR" style="display:block;width:220px;height:220px;" />
        </div>

        <div style="margin-top:10px;color:#cbd5e1;font-size:12px;font-weight:800;">
          Escanea para ver tus boletos por cédula
        </div>

        <div style="margin-top:8px;">
          <a href="${boletosUrl}"
             style="display:inline-block;padding:12px 18px;background:#fbbf24;color:#111827;text-decoration:none;border-radius:10px;font-weight:900;font-size:12px;">
            Ver mis boletos
          </a>
        </div>

        <div style="margin-top:10px;color:#64748b;font-size:11px;font-weight:700;word-break:break-all;">
          ${boletosUrl}
        </div>
      </div>

      <div style="padding:14px 18px;border-top:1px solid #1f2937;background:#0f172a;color:#94a3b8;font-size:11px;font-weight:700;line-height:1.5;">
        Si no reconoces esta compra o hay un error en tus datos, responde a este correo.
      </div>
    </div>
  </div>
  `;
}

function buildTicketsEmailText(params: {
  fullName: string;
  userCountryCode: string;
  userIdNumber: string;
  quantity: number;
  totalAmount: number;
  bank: string;
  referenceNumber: string;
  ticketPrice: number;
  tickets: number[];
  transactionDate: string;
  transactionId: string;
}) {
  const {
    fullName,
    userCountryCode,
    userIdNumber,
    quantity,
    totalAmount,
    bank,
    referenceNumber,
    ticketPrice,
    tickets,
    transactionDate,
    transactionId,
  } = params;

  const cedulaFull = `${String(userCountryCode || "").toUpperCase()}${String(
    userIdNumber || ""
  ).trim()}`;

  const boletosUrl = `${BASE_URL}/boletos/${encodeURIComponent(cedulaFull)}`;

  return [
    "Ya estás participando",
    `Nombre: ${fullName}`,
    `Cédula: ${cedulaFull}`,
    `Compra ID: ${transactionId}`,
    `Banco: ${bank}`,
    `Referencia: ${referenceNumber}`,
    `Cantidad: ${quantity}`,
    `Precio: Bs. ${Number(ticketPrice).toFixed(2)}`,
    `Total: Bs. ${Number(totalAmount).toFixed(2)}`,
    `Fecha: ${transactionDate}`,
    `Boletos: ${(tickets || []).join(", ")}`,
    "",
    `Ver mis boletos: ${boletosUrl}`,
  ].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // ✅ Datos del usuario + compra
    const fullName = String(formData.get("fullName") || "").trim();
    const userCountryCode = String(formData.get("userCountryCode") || "")
      .trim()
      .toUpperCase();
    const userIdNumber = String(formData.get("userIdNumber") || "")
      .trim()
      .replace(/\D/g, ""); // solo números
    const userPhone = String(formData.get("userPhone") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const paymentMethod = String(formData.get("paymentMethod") || "").trim();

    const quantity = Number(formData.get("quantity") || 0);
    const totalAmount = Number(formData.get("totalAmount") || 0);
    const ticketPrice = Number(formData.get("ticketPrice") || 0);

    const bank = String(formData.get("bank") || "").trim();
    const referenceNumber = String(
      formData.get("referenceNumber") || ""
    ).trim();

    // ✅ Comprobante
    const proofImage = formData.get("proofFile") as File | null;

    // ✅ Validaciones
    if (!fullName || !email || !paymentMethod) {
      return NextResponse.json(
        { ok: false, error: "Faltan datos del usuario" },
        { status: 400 }
      );
    }

    if (!["V", "E", "J", "G"].includes(userCountryCode)) {
      return NextResponse.json(
        { ok: false, error: "userCountryCode inválido (V/E/J/G)" },
        { status: 400 }
      );
    }

    if (!userIdNumber || userIdNumber.length < 4) {
      return NextResponse.json(
        { ok: false, error: "userIdNumber inválido" },
        { status: 400 }
      );
    }

    if (!referenceNumber || !bank) {
      return NextResponse.json(
        { ok: false, error: "Faltan datos del pago (bank/reference)" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json(
        { ok: false, error: "Cantidad inválida" },
        { status: 400 }
      );
    }

    // ✅ CLAVE: NO guardes nada si no hay comprobante
    if (!proofImage || (proofImage instanceof File && proofImage.size === 0)) {
      return NextResponse.json(
        { ok: false, error: "Ingrese su comprobante de pago" },
        { status: 400 }
      );
    }

    if (proofImage instanceof File && !proofImage.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "El comprobante debe ser una imagen" },
        { status: 400 }
      );
    }

    // ✅ Ahora sí: genera tickets y guarda
    const assignedTickets = generateTickets(quantity);
    const transactionDate = new Date().toISOString();

    const client = await connectToDatabase();
    const db = client.db(MONGODB_DB_NAME);
    const col = db.collection(MONGODB_COLLECTION);

    const doc = {
      fullName,
      email,
      userCountryCode,
      userIdNumber,
      userPhone,
      paymentMethod,

      quantity,
      totalAmount,
      ticketPrice,

      bank,
      referenceNumber,

      assignedTickets,
      transactionDate,

      status: "confirmed",
      createdAt: new Date(),
    };

    const result = await col.insertOne(doc);
    const transactionId = result.insertedId as ObjectId;

    // ✅ Telegram (no rompe si falla)
    const caption =
      `🧾 <b>Nuevo reporte de pago</b>\n\n` +
      `🆔 <b>ID:</b> <code>${transactionId.toString()}</code>\n` +
      `👤 <b>Nombre:</b> ${escapeHtml(fullName)}\n` +
      `🪪 <b>Cédula:</b> ${escapeHtml(userCountryCode + userIdNumber)}\n` +
      `📧 <b>Email:</b> ${escapeHtml(email)}\n` +
      `📱 <b>Teléfono:</b> ${escapeHtml(userPhone)}\n` +
      `🏦 <b>Banco:</b> ${escapeHtml(bank)}\n` +
      `🔢 <b>Referencia:</b> ${escapeHtml(referenceNumber)}\n` +
      `💰 <b>Total:</b> Bs. ${totalAmount}\n` +
      `🎟️ <b>Tickets (${assignedTickets.length}):</b> ${escapeHtml(
        assignedTickets.join(", ")
      )}`;

    try {
      const tg = await sendToTelegram(caption, proofImage);
      if (tg?.ok === false) console.error("Telegram error:", tg);
    } catch (e) {
      console.error("Telegram exception:", e);
    }

    // ✅ Email (no rompe si falla)
    let emailStatus: "sent" | "skipped" | "failed" = "skipped";
    let emailError: string | null = null;

    try {
      if (email) {
        const html = buildTicketsEmailHTML({
          fullName,
          userCountryCode,
          userIdNumber,
          quantity,
          totalAmount,
          bank,
          referenceNumber,
          ticketPrice,
          tickets: assignedTickets,
          transactionDate,
          transactionId: transactionId.toString(),
          raffleTitle: "CAMBIA TU VIDA #1.0 🔥",
          raffleDate: "30 Dic 2025",
          // raffleImageUrl: "https://tu-imagen-real.jpg",
        });

        const text = buildTicketsEmailText({
          fullName,
          userCountryCode,
          userIdNumber,
          quantity,
          totalAmount,
          bank,
          referenceNumber,
          ticketPrice,
          tickets: assignedTickets,
          transactionDate,
          transactionId: transactionId.toString(),
        });

        await sendTicketsEmail(
          email,
          "✅ Confirmación - Ya estás participando",
          html,
          text
        );

        emailStatus = "sent";
      }
    } catch (e: any) {
      emailStatus = "failed";
      emailError = e?.message || String(e);
      console.error("Email error:", emailError);
    }

    return NextResponse.json({
      ok: true,
      transactionId: transactionId.toString(),
      tickets: assignedTickets,
      emailStatus,
      emailError,
    });
  } catch (error: any) {
    console.error("❌ Error crítico payment-report:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Error al procesar el reporte de pago",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
