import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export const runtime = "nodejs";

// ✅ Usa ENV en producción. Aquí lo dejo como ejemplo directo.
const MONGODB_URI =
  "mongodb+srv://digimonapk_db_user:6QuqQzYfgRASqe4l@cluster0.3htrzei.mongodb.net";
const MONGODB_DB_NAME = "raffle_db";
const MONGODB_COLLECTION = "tickets2";

let cachedClient: MongoClient | null = null;

async function connectToDatabase() {
  if (cachedClient) return cachedClient;
  const client = await MongoClient.connect(MONGODB_URI);
  cachedClient = client;
  return client;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const cc = (searchParams.get("cc") || "").trim().toUpperCase(); // V/E/J/G
    const ci = (searchParams.get("ci") || "").trim(); // 12345678

    // paginación básica
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10))
    );
    const skip = (page - 1) * limit;

    if (!cc || !ci) {
      return NextResponse.json(
        { ok: false, error: "Faltan parámetros", required: ["cc", "ci"] },
        { status: 400 }
      );
    }

    const client = await connectToDatabase();
    const db = client.db(MONGODB_DB_NAME);
    const col = db.collection(MONGODB_COLLECTION);

    // ✅ Busca por la cédula exacta que guardas en DB
    const filter = { userCountryCode: cc, userIdNumber: ci };

    const total = await col.countDocuments(filter);

    const lots = await col
      .find(filter, {
        projection: {
          _id: 1,
          createdAt: 1,
          status: 1,
          paymentMethod: 1,
          quantity: 1,
          totalAmount: 1,
          ticketPrice: 1,
          bank: 1,
          referenceNumber: 1,
          assignedTickets: 1,
          transactionDate: 1,
          fullName: 1,
          email: 1,
          userPhone: 1,
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // formateo de salida (lotes)
    const formatted = lots.map((doc: any) => ({
      lotId: doc._id.toString(),
      createdAt: doc.createdAt,
      status: doc.status,
      paymentMethod: doc.paymentMethod,
      quantity: doc.quantity,
      totalAmount: doc.totalAmount,
      ticketPrice: doc.ticketPrice,
      bank: doc.bank,
      referenceNumber: doc.referenceNumber,
      transactionDate: doc.transactionDate,
      tickets: doc.assignedTickets || [],
    }));

    return NextResponse.json({
      ok: true,
      cedula: `${cc}-${ci}`,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      lots: formatted,
    });
  } catch (e: any) {
    console.error("❌ tickets-by-cedula error:", e);
    return NextResponse.json(
      {
        ok: false,
        error: "Error consultando tickets",
        details: e?.message ?? String(e),
      },
      { status: 500 }
    );
  }
}
