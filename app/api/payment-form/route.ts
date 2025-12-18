import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      fullName,
      idCountryCode,
      idNumber,
      phone,
      email,
      quantity,
      paymentMethod,
      total,
    } = body;

    if (
      !fullName ||
      !idNumber ||
      !phone ||
      !email ||
      !quantity ||
      !paymentMethod
    ) {
      return NextResponse.json(
        { ok: false, error: "Faltan datos" },
        { status: 400 }
      );
    }

    // ✅ Por ahora: id simple (luego lo guardas en Mongo)
    const orderId = randomUUID();

    return NextResponse.json({ ok: true, orderId });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Error" },
      { status: 500 }
    );
  }
}
