import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, getSettings } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  const settings = await getSettings();
  const history = await db.withdrawal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    balance: user.balance,
    minWithdraw: settings.minWithdraw,
    history,
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  const settings = await getSettings();
  const body = await req.json();
  const amount = Number(body.amount || 0);
  const method = String(body.method || "").trim();
  const accountInfo = String(body.accountInfo || "").trim();

  if (!amount || amount <= 0) {
    return NextResponse.json(
      { error: "Jumlah withdraw tidak valid" },
      { status: 400 }
    );
  }
  if (amount < settings.minWithdraw) {
    return NextResponse.json(
      { error: `Minimal withdraw Rp ${settings.minWithdraw.toLocaleString("id-ID")}` },
      { status: 400 }
    );
  }
  if (amount > user.balance) {
    return NextResponse.json(
      { error: "Saldo tidak mencukupi" },
      { status: 400 }
    );
  }
  if (!method) {
    return NextResponse.json(
      { error: "Metode pencairan wajib dipilih" },
      { status: 400 }
    );
  }
  if (!accountInfo || accountInfo.length < 5) {
    return NextResponse.json(
      { error: "Info tujuan pencairan wajib diisi (contoh: 081234567890 a.n. Budi)" },
      { status: 400 }
    );
  }

  const pending = await db.withdrawal.findFirst({
    where: { userId: user.id, status: "PENDING" },
  });
  if (pending) {
    return NextResponse.json(
      { error: "Masih ada permintaan withdraw yang diproses" },
      { status: 400 }
    );
  }

  let withdrawal;
  try {
    withdrawal = await db.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.id, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      return tx.withdrawal.create({
        data: { userId: user.id, amount, method, accountInfo },
      });
    });
  } catch {
    return NextResponse.json(
      { error: "Saldo tidak mencukupi" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, withdrawal });
}
