import { NextResponse } from "next/server";
import { getCurrentUser, getSettings } from "@/lib/auth";
import { getRun } from "@/lib/blast";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const settings = await getSettings();
  const run = getRun(user.id);
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      phone: user.phone,
      balance: user.balance,
      totalEarned: user.totalEarned,
      status: user.status,
      createdAt: user.createdAt,
    },
    settings: {
      ratePerChat: settings.ratePerChat,
      minWithdraw: settings.minWithdraw,
      maintenance: settings.maintenance,
      maintenanceNote: settings.maintenanceNote,
      hasMessage: settings.messageTemplate.length > 0,
    },
    blastRunning: run?.running ?? false,
  });
}
