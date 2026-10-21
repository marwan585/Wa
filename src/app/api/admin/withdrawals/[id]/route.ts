import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/** Confirm a withdrawal: SUCCESS or FAILED (FAILED refunds the balance). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const action = String(body.action || ""); // approve | reject
  const note = String(body.note || "").slice(0, 250);

  const wd = await db.withdrawal.findUnique({ where: { id } });
  if (!wd) {
    return NextResponse.json(
      { error: "Permintaan tidak ditemukan" },
      { status: 404 }
    );
  }
  if (wd.status !== "PENDING") {
    return NextResponse.json(
      { error: "Permintaan ini sudah diproses" },
      { status: 400 }
    );
  }

  if (action === "approve") {
    await db.$transaction([
      db.withdrawal.update({
        where: { id },
        data: { status: "SUCCESS", note, processedAt: new Date() },
      }),
      db.user.update({
        where: { id: wd.userId },
        data: { totalEarned: { increment: 0 } },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    await db.$transaction([
      db.withdrawal.update({
        where: { id },
        data: { status: "FAILED", note, processedAt: new Date() },
      }),
      db.user.update({
        where: { id: wd.userId },
        data: { balance: { increment: wd.amount } },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
}
