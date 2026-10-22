import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, getSettings } from "@/lib/auth";
import { startBlast, stopBlast, getRun, clampDelay, MIN_DELAY_SEC, MAX_DELAY_SEC } from "@/lib/blast";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  const settings = await getSettings();
  const run = getRun(user.id);

  const [targetsAvailable, targetsUsed, sentCount, revokedCount, recent] = await Promise.all([
    db.targetNumber.count({ where: { status: "AVAILABLE" } }),
    db.targetNumber.count({ where: { status: "USED" } }),
    db.blast.count({ where: { userId: user.id, status: "SENT" } }),
    db.blast.count({ where: { userId: user.id, status: "REVOKED" } }),
    db.blast.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return NextResponse.json({
    running: run?.running ?? false,
    run: run
      ? {
          sent: run.sent,
          failed: run.failed,
          earned: run.earned,
          delaySec: run.delaySec,
          lastMessage: run.lastMessage,
          lastError: run.lastError,
          startedAt: run.startedAt,
        }
      : null,
    targets: { available: targetsAvailable, used: targetsUsed },
    stats: { sentCount, revokedCount },
    settings: {
      ratePerChat: settings.ratePerChat,
      maintenance: settings.maintenance,
      maintenanceNote: settings.maintenanceNote,
      hasMessage: settings.messageTemplate.length > 0,
      blastDelay: user.blastDelay,
      minDelay: MIN_DELAY_SEC,
      maxDelay: MAX_DELAY_SEC,
    },
    recent,
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  const body = await req.json();
  const action = String(body.action || "");

  if (action === "start") {
    const settings = await getSettings();
    if (settings.maintenance) {
      return NextResponse.json(
        { error: settings.maintenanceNote || "Server sedang maintenance" },
        { status: 503 }
      );
    }
    if (!settings.messageTemplate) {
      return NextResponse.json(
        { error: "Pesan blast belum diatur oleh admin" },
        { status: 400 }
      );
    }
    if (user.status === "BANNED") {
      return NextResponse.json(
        { error: "Akun Anda diblokir" },
        { status: 403 }
      );
    }
    const sessionId = String(body.sessionId || "");
    const session = await db.waSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== user.id) {
      return NextResponse.json(
        { error: "Sesi WhatsApp tidak ditemukan" },
        { status: 404 }
      );
    }
    const available = await db.targetNumber.count({
      where: { status: "AVAILABLE" },
    });
    if (available === 0) {
      return NextResponse.json(
        { error: "Nomor target sedang kosong, tunggu admin menambahkan" },
        { status: 400 }
      );
    }
    const result = startBlast(user.id, sessionId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "stop") {
    stopBlast(user.id);
    return NextResponse.json({ ok: true });
  }

  if (action === "set-delay") {
    const delay = clampDelay(body.delay);
    await db.user.update({
      where: { id: user.id },
      data: { blastDelay: delay },
    });
    return NextResponse.json({ ok: true, delay });
  }

  return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
}
