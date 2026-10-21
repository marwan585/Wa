import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { waManager } from "@/lib/whatsapp";

/** List of every WhatsApp session across users with live status. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  const sessions = await db.waSession.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { username: true, email: true, status: true } },
    },
  });

  const result = sessions.map((s) => {
    const rt = waManager.sessions.get(s.id);
    return {
      id: s.id,
      phone: s.phone,
      status: rt ? rt.status : "DISCONNECTED",
      createdAt: s.createdAt,
      username: s.user.username,
      email: s.user.email,
      userStatus: s.user.status,
    };
  });

  return NextResponse.json({ sessions: result });
}
