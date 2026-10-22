import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sanitizePhone, startSocket, waManager, sessionsDir } from "@/lib/whatsapp";
import fs from "fs";
import path from "path";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  const sessions = await db.waSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const result = sessions.map((s) => {
    const rt = waManager.sessions.get(s.id);
    return {
      id: s.id,
      phone: s.phone,
      status: rt ? rt.status : "DISCONNECTED",
      pairingCode: rt?.pairingCode,
      accountType: rt?.accountType || s.accountType,
      createdAt: s.createdAt,
    };
  });

  return NextResponse.json({ sessions: result });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const phone = sanitizePhone(String(body.phone || ""));
    if (phone.length < 9 || phone.length > 15) {
      return NextResponse.json(
        { error: "Nomor WhatsApp tidak valid. Format: kode negara + nomor (contoh 6281234567890)" },
        { status: 400 }
      );
    }

    const count = await db.waSession.count({ where: { userId: user.id } });
    if (count >= 3) {
      return NextResponse.json(
        { error: "Maksimal 3 sesi WhatsApp per akun" },
        { status: 400 }
      );
    }

    const session = await db.waSession.create({
      data: { userId: user.id, phone, status: "WAITING_PAIRING" },
    });

    await startSocket(session.id, user.id, phone);

    const rt = waManager.sessions.get(session.id);
    return NextResponse.json({
      session: {
        id: session.id,
        phone,
        status: rt?.status || "CONNECTING",
        pairingCode: rt?.pairingCode,
        accountType: rt?.accountType || "UNKNOWN",
      },
    });
  } catch (err) {
    console.error("[session create]", err);
    return NextResponse.json(
      { error: "Gagal membuat sesi WhatsApp" },
      { status: 500 }
    );
  }
}

/** Cleanup: remove orphan session folders not belonging to any DB row (admin only touches via own route). */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
  }
  const session = await db.waSession.findUnique({ where: { id } });
  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
  }

  const rt = waManager.sessions.get(id);
  try {
    if (rt?.socket) {
      try {
        await rt.socket.logout();
      } catch {
        try {
          rt.socket.end(undefined);
        } catch {
          /* ignore */
        }
      }
    }
  } finally {
    waManager.sessions.delete(id);
    try {
      const dir = path.join(sessionsDir(), id);
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    await db.waSession.delete({ where: { id } }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
