import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { waManager } from "@/lib/whatsapp";

/** Polling endpoint: live status + pairing code for one session. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  const { id } = await params;
  const session = await db.waSession.findUnique({ where: { id } });
  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
  }
  const rt = waManager.sessions.get(id);
  return NextResponse.json({
    session: {
      id: session.id,
      phone: session.phone,
      status: rt ? rt.status : "DISCONNECTED",
      pairingCode: rt?.pairingCode,
    },
  });
}
