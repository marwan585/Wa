import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { waManager, sessionsDir } from "@/lib/whatsapp";
import fs from "fs";
import path from "path";

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
  const action = String(body.action || "");

  if (action === "ban") {
    await db.user.update({ where: { id }, data: { status: "BANNED" } });
    return NextResponse.json({ ok: true });
  }
  if (action === "unban") {
    await db.user.update({ where: { id }, data: { status: "ACTIVE" } });
    return NextResponse.json({ ok: true });
  }
  if (action === "adjustBalance") {
    const amount = Number(body.amount || 0);
    if (!amount) {
      return NextResponse.json(
        { error: "Jumlah tidak valid" },
        { status: 400 }
      );
    }
    await db.user.update({
      where: { id },
      data: { balance: { increment: amount } },
    });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  const { id } = await params;

  // Remove the user's WhatsApp sessions (sockets + folders)
  const sessions = await db.waSession.findMany({ where: { userId: id } });
  for (const s of sessions) {
    const rt = waManager.sessions.get(s.id);
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
    waManager.sessions.delete(s.id);
    try {
      const dir = path.join(sessionsDir(), s.id);
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  await db.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
