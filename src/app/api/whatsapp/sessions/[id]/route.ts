import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  waManager,
  startSocket,
  regeneratePairingCode,
  reconnectSession,
} from "@/lib/whatsapp";

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
      accountType: rt?.accountType || session.accountType,
    },
  });
}

/**
 * Session actions:
 * - REGENERATE_PAIRING → stop socket, boot fresh, issue a new pairing code
 * - RECONNECT          → resume session (auto-pair again if not registered)
 */
export async function POST(
  req: NextRequest,
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

  const body = await req.json().catch(() => ({}));
  const action = String((body as { action?: string }).action || "");

  try {
    if (action === "REGENERATE_PAIRING") {
      const rt = waManager.sessions.get(id);
      if (rt) {
        const res = await regeneratePairingCode(id);
        if (!res.ok) {
          return NextResponse.json({ error: res.error }, { status: 400 });
        }
      } else {
        // No runtime (e.g. after server restart) → boot it; a pairing
        // code will be issued automatically on the qr event.
        await startSocket(id, session.userId, session.phone);
      }
    } else if (action === "RECONNECT") {
      await reconnectSession(id, session.userId, session.phone);
    } else {
      return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
    }
  } catch (err) {
    console.error("[session action]", action, err);
    return NextResponse.json({ error: "Gagal menjalankan aksi" }, { status: 500 });
  }

  const rt = waManager.sessions.get(id);
  return NextResponse.json({
    session: {
      id,
      phone: session.phone,
      status: rt?.status || "CONNECTING",
      pairingCode: rt?.pairingCode,
      accountType: rt?.accountType || session.accountType,
    },
  });
}
