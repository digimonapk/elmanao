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
const SMTP_USER = "ticketsenvio@elmanaorifasvnz.com";
const SMTP_PASS = "Holas123@@";
const EMAIL_FROM = `"Elmanao" <${SMTP_USER}>`;
const MONGODB_URI =
  "mongodb+srv://digimonapk_db_user:6QuqQzYfgRASqe4l@cluster0.3htrzei.mongodb.net";
const MONGODB_DB_NAME = "raffle_db";
const MONGODB_COLLECTION = "tickets2";
const BASE_URL = "https://elmanao.vercel.app/";

let cachedClient: MongoClient | null = null;

async function connectToDatabase() {
  if (cachedClient) return cachedClient;
  if (!MONGODB_URI) throw new Error("MONGODB_URI no configurado");
  const client = await MongoClient.connect(MONGODB_URI);
  cachedClient = client;
  return client;
}

function escapeHtml(text: string): string {
  return (text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function generateTickets(qty: number): number[] {
  return Array.from({ length: qty }, () =>
    Math.floor(100000 + Math.random() * 900000)
  );
}

async function sendToTelegram(
  caption: string,
  imageFile?: File | Blob
): Promise<any> {
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
    {
      method: "POST",
      body: fd,
    }
  );
  return await tgResp.json();
}

async function sendTicketsEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
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

interface TicketsEmailParams {
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
  raffleTitle?: string;
  raffleDate?: string;
  raffleImageUrl?: string;
}

function buildTicketsEmailHTML(params: TicketsEmailParams): string {
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
  const boletosUrl = `${BASE_URL}boletos/${encodeURIComponent(cedulaFull)}`;
  const qrImg = `https://quickchart.io/qr?text=${encodeURIComponent(
    boletosUrl
  )}&size=300`;

  const ticketsHtml = (tickets || [])
    .map(
      (t) =>
        `<div style="display:inline-block;background:#10b981;color:#fff;padding:12px 20px;margin:6px;border-radius:8px;font-weight:700;font-size:18px;box-shadow:0 2px 4px rgba(16,185,129,0.3);">${t}</div>`
    )
    .join("");

  // Formateamos la fecha de manera más legible
  const formattedDate = new Date(transactionDate).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Confirmación de Compra - ${escapeHtml(raffleTitle)}</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8fafc;line-height:1.6;">
  
  <!-- Container Principal -->
  <div style="width:100%;max-width:650px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.1);">
    
    <!-- Header con Gradient -->
    <div style="background:linear-gradient(135deg,#10b981 0%,#059669 50%,#047857 100%);padding:40px 30px;text-align:center;position:relative;">
      <div style="background:rgba(255,255,255,0.15);width:80px;height:80px;border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);">
        <span style="font-size:40px;">✅</span>
      </div>
      <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:800;text-shadow:0 2px 4px rgba(0,0,0,0.1);">¡Ya Estás Participando!</h1>
      <p style="margin:10px 0 0;color:#d1fae5;font-size:16px;font-weight:500;">Tu compra ha sido confirmada exitosamente</p>
    </div>

    <!-- Contenido Principal -->
    <div style="padding:40px 30px;">
      
      <!-- Información de la Rifa -->
      <div style="text-align:center;margin-bottom:40px;padding:30px;background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);border-radius:12px;border:2px solid #10b981;">
        <img src="${escapeHtml(raffleImageUrl)}" alt="${escapeHtml(
    raffleTitle
  )}" style="max-width:100%;height:auto;border-radius:12px;margin-bottom:20px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
        <h2 style="margin:0 0 10px;color:#047857;font-size:28px;font-weight:700;">${escapeHtml(
          raffleTitle
        )}</h2>
        <p style="margin:0;color:#059669;font-size:18px;font-weight:600;">
          <span style="background:#10b981;color:#fff;padding:8px 16px;border-radius:20px;display:inline-block;">
            📅 Sorteo: ${escapeHtml(raffleDate)}
          </span>
        </p>
      </div>

      <!-- Datos del Comprador -->
      <div style="background:#f8fafc;border-left:5px solid #10b981;padding:25px;margin-bottom:30px;border-radius:8px;">
        <h3 style="margin:0 0 15px;color:#1e293b;font-size:18px;font-weight:700;">👤 Información del Participante</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#64748b;font-weight:600;width:35%;">Nombre:</td>
            <td style="padding:8px 0;color:#1e293b;font-weight:700;">${escapeHtml(
              fullName
            )}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;font-weight:600;">Cédula:</td>
            <td style="padding:8px 0;color:#1e293b;font-weight:700;">${escapeHtml(
              cedulaFull
            )}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;font-weight:600;">Núm. Compra:</td>
            <td style="padding:8px 0;color:#10b981;font-weight:700;font-family:monospace;">#${escapeHtml(
              transactionId
            )}</td>
          </tr>
        </table>
      </div>

      <!-- Alerta Importante -->
      <div style="background:#eff6ff;border:2px solid #3b82f6;border-radius:10px;padding:20px;margin-bottom:35px;">
        <p style="margin:0;color:#1e40af;font-size:15px;line-height:1.7;">
          <strong style="color:#1e3a8a;">ℹ️ Importante:</strong> Guarda este correo como comprobante. Te contactaremos el día del sorteo si resultas ganador. ¡Mucha suerte! 🍀
        </p>
      </div>

      <!-- Boletos Comprados -->
      <div style="margin-bottom:35px;">
        <h3 style="margin:0 0 20px;color:#1e293b;font-size:22px;font-weight:700;text-align:center;">🎟️ Tus Boletos (${quantity})</h3>
        <div style="text-align:center;padding:20px;background:#f1f5f9;border-radius:12px;">
          ${ticketsHtml}
        </div>
      </div>

      <!-- Detalles del Pago -->
      <div style="background:#ffffff;border:2px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:35px;">
        <div style="background:#1e293b;padding:15px;text-align:center;">
          <h3 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">💳 Detalles del Pago</h3>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:18px 25px;color:#64748b;font-weight:600;">Precio por boleto</td>
            <td style="padding:18px 25px;text-align:right;color:#1e293b;font-weight:700;font-size:16px;">Bs. ${Number(
              ticketPrice
            ).toFixed(2)}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;background:#f8fafc;">
            <td style="padding:18px 25px;color:#64748b;font-weight:600;">Cantidad de boletos</td>
            <td style="padding:18px 25px;text-align:right;color:#1e293b;font-weight:700;font-size:16px;">${quantity}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:18px 25px;color:#64748b;font-weight:600;">Banco</td>
            <td style="padding:18px 25px;text-align:right;color:#1e293b;font-weight:700;font-size:16px;">${escapeHtml(
              bank
            )}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;background:#f8fafc;">
            <td style="padding:18px 25px;color:#64748b;font-weight:600;">Referencia</td>
            <td style="padding:18px 25px;text-align:right;color:#1e293b;font-weight:700;font-family:monospace;font-size:16px;">${escapeHtml(
              referenceNumber
            )}</td>
          </tr>
          <tr style="background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);">
            <td style="padding:20px 25px;color:#047857;font-weight:800;font-size:18px;">Total Pagado</td>
            <td style="padding:20px 25px;text-align:right;color:#10b981;font-weight:800;font-size:24px;">Bs. ${Number(
              totalAmount
            ).toFixed(2)}</td>
          </tr>
        </table>
        <div style="padding:15px 25px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;color:#64748b;font-size:14px;">📅 Fecha: <strong style="color:#1e293b;">${formattedDate}</strong></p>
        </div>
      </div>

      <!-- QR Code Section -->
      <div style="text-align:center;background:linear-gradient(135deg,#fafafa 0%,#f5f5f5 100%);padding:40px 30px;border-radius:12px;border:2px dashed #10b981;margin-bottom:30px;">
        <h3 style="margin:0 0 15px;color:#1e293b;font-size:20px;font-weight:700;">📱 Consulta Tus Boletos</h3>
        <p style="margin:0 0 25px;color:#64748b;font-size:15px;">Escanea el código QR o haz clic en el botón</p>
        
        <!-- QR Code centrado -->
        <div style="text-align:center;margin:0 0 25px;">
          <img src="${qrImg}" alt="QR Code" style="width:300px;height:300px;border:8px solid #ffffff;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);display:inline-block;">
        </div>
        
        <a href="${boletosUrl}" style="display:inline-block;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#ffffff;padding:16px 40px;text-decoration:none;border-radius:50px;font-weight:700;font-size:16px;box-shadow:0 4px 12px rgba(16,185,129,0.4);transition:all 0.3s ease;">
          🎫 Ver Mis Boletos
        </a>
        
        <p style="margin:20px 0 0;color:#94a3b8;font-size:13px;word-break:break-all;font-family:monospace;">${boletosUrl}</p>
      </div>

      <!-- Footer Info -->
      <div style="text-align:center;padding:25px;background:#f8fafc;border-radius:10px;">
        <p style="margin:0;color:#64748b;font-size:14px;line-height:1.6;">
          ⚠️ Si no reconoces esta compra o hay algún error en tus datos,<br>
          <strong>responde a este correo</strong> o contáctanos de inmediato.
        </p>
      </div>

    </div>

    <!-- Footer del Email -->
    <div style="background:#1e293b;padding:30px;text-align:center;">
      <p style="margin:0 0 10px;color:#cbd5e1;font-size:14px;">
        <strong style="color:#ffffff;">Elmanao Rifas</strong>
      </p>
      <p style="margin:0;color:#94a3b8;font-size:13px;">
        © 2025 Todos los derechos reservados
      </p>
    </div>

  </div>

</body>
</html>`;
}

function buildTicketsEmailText(params: TicketsEmailParams): string {
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
  const boletosUrl = `${BASE_URL}boletos/${encodeURIComponent(cedulaFull)}`;

  return [
    "✅ ¡YA ESTÁS PARTICIPANDO!",
    "",
    "INFORMACIÓN DEL PARTICIPANTE",
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    `Nombre: ${fullName}`,
    `Cédula: ${cedulaFull}`,
    `Núm. Compra: #${transactionId}`,
    "",
    "DETALLES DEL PAGO",
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    `Banco: ${bank}`,
    `Referencia: ${referenceNumber}`,
    `Cantidad: ${quantity} boleto(s)`,
    `Precio unitario: Bs. ${Number(ticketPrice).toFixed(2)}`,
    `TOTAL PAGADO: Bs. ${Number(totalAmount).toFixed(2)}`,
    `Fecha: ${transactionDate}`,
    "",
    "TUS BOLETOS",
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    `${(tickets || []).join(", ")}`,
    "",
    "VER MIS BOLETOS:",
    `${boletosUrl}`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    "Guarda este correo como comprobante.",
    "¡Mucha suerte! 🍀",
  ].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const fullName = String(formData.get("fullName") || "").trim();
    const rawCountry =
      formData.get("userCountryCode") ??
      formData.get("countryCode") ??
      formData.get("idCountryCode");
    const userCountryCode = String(rawCountry || "")
      .trim()
      .toUpperCase();
    const rawId =
      formData.get("userIdNumber") ??
      formData.get("idNumber") ??
      formData.get("id_number");
    const userIdNumber = String(rawId || "")
      .trim()
      .replace(/\D/g, "");
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
    const proofImage = formData.get("proofFile") as File | null;

    // Validaciones
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
    if (!userIdNumber) {
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

    const caption =
      `🧾 Nuevo reporte de pago\n\n` +
      `🆔 ID: \`${transactionId.toString()}\`\n` +
      `👤 Nombre: ${escapeHtml(fullName)}\n` +
      `🪪 Cédula: ${escapeHtml(userCountryCode + userIdNumber)}\n` +
      `📧 Email: ${escapeHtml(email)}\n` +
      `📱 Teléfono: ${escapeHtml(userPhone)}\n` +
      `🏦 Banco: ${escapeHtml(bank)}\n` +
      `🔢 Referencia: ${escapeHtml(referenceNumber)}\n` +
      `💰 Total: Bs. ${totalAmount}\n` +
      `🎟️ Tickets (${assignedTickets.length}): ${escapeHtml(
        assignedTickets.join(", ")
      )}`;

    try {
      const tg = await sendToTelegram(caption, proofImage);
      if (tg?.ok === false) console.error("Telegram error:", tg);
    } catch (e) {
      console.error("Telegram exception:", e);
    }

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
