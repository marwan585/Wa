import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getSettings } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  const body = await req.json();
  const settings = await getSettings();

  const messageTemplate = body.messageTemplate !== undefined
    ? String(body.messageTemplate).slice(0, 2000)
    : settings.messageTemplate;

  let ratePerChat = settings.ratePerChat;
  if (body.ratePerChat !== undefined) {
    const v = Number(body.ratePerChat);
    if (!v || v < 900) {
      return NextResponse.json(
        { error: "Rate per chat minimal Rp 900" },
        { status: 400 }
      );
    }
    ratePerChat = Math.round(v);
  }

  let minWithdraw = settings.minWithdraw;
  if (body.minWithdraw !== undefined) {
    const v = Number(body.minWithdraw);
    if (!v || v < 1000) {
      return NextResponse.json(
        { error: "Minimal withdraw tidak valid" },
        { status: 400 }
      );
    }
    minWithdraw = Math.round(v);
  }

  const maintenance =
    body.maintenance !== undefined
      ? Boolean(body.maintenance)
      : settings.maintenance;

  const maintenanceNote =
    body.maintenanceNote !== undefined
      ? String(body.maintenanceNote).slice(0, 300)
      : settings.maintenanceNote;

  await db.setting.update({
    where: { id: "main" },
    data: { messageTemplate, ratePerChat, minWithdraw, maintenance, maintenanceNote },
  });

  return NextResponse.json({ ok: true });
}
