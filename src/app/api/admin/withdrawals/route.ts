import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";

  const where: Record<string, unknown> = {};
  if (status && ["PENDING", "SUCCESS", "FAILED"].includes(status)) {
    where.status = status;
  }

  const withdrawals = await db.withdrawal.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      user: { select: { username: true, email: true, phone: true } },
    },
  });

  return NextResponse.json({ withdrawals });
}
