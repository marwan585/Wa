import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status") || "";

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { username: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
    ];
  }
  if (status === "BANNED" || status === "ACTIVE") where.status = status;

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      balance: true,
      totalEarned: true,
      status: true,
      createdAt: true,
      _count: { select: { blasts: true, sessions: true, withdrawals: true } },
    },
  });

  return NextResponse.json({ users });
}
