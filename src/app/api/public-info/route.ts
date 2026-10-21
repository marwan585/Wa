import { NextResponse } from "next/server";
import { getSettings } from "@/lib/auth";

/** Public settings summary for the landing page. */
export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({
      ratePerChat: settings.ratePerChat,
      minWithdraw: settings.minWithdraw,
      maintenance: settings.maintenance,
    });
  } catch {
    return NextResponse.json({
      ratePerChat: 900,
      minWithdraw: 10000,
      maintenance: false,
    });
  }
}
