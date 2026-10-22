import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/** Global blast monitor for admins. */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";

  const where: Record<string, unknown> = {};
  if (status && ["SENT", "FAILED", "PENDING", "REVOKED"].includes(status)) {
    where.status = status;
  }

  const blasts = await db.blast.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { username: true } } },
  });

  return NextResponse.json({ blasts });
}
