import { NextResponse } from "next/server";
import { clearAuthCookie, USER_COOKIE } from "@/lib/auth";

export async function POST() {
  await clearAuthCookie(USER_COOKIE);
  return NextResponse.json({ ok: true });
}
