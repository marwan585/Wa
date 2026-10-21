import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  signAdminToken,
  setAuthCookie,
  clearAuthCookie,
  ADMIN_COOKIE,
  getAdminFromToken,
} from "@/lib/auth";

/** Lightweight admin session check. */
export async function GET() {
  const payload = await getAdminFromToken();
  if (!payload) {
    return NextResponse.json({ admin: false }, { status: 401 });
  }
  const admin = await db.admin.findUnique({ where: { id: payload.adminId } });
  if (!admin) {
    return NextResponse.json({ admin: false }, { status: 401 });
  }
  return NextResponse.json({ admin: true, username: admin.username });
}

/**
 * Admin login. The initial admin account is seeded silently on first use
 * from server-side environment values. Credentials are never exposed to the UI.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi" },
        { status: 400 }
      );
    }

    // Silent seed of the first admin account
    const adminCount = await db.admin.count();
    if (adminCount === 0) {
      const seedUser = process.env.ADMIN_USERNAME || "Marwan";
      const seedPass = process.env.ADMIN_PASSWORD || "marwan123";
      await db.admin.create({
        data: {
          username: seedUser,
          password: await bcrypt.hash(seedPass, 10),
        },
      });
    }

    const admin = await db.admin.findUnique({ where: { username } });
    if (!admin) {
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 }
      );
    }
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 }
      );
    }

    const token = await signAdminToken(admin.id);
    await setAuthCookie(ADMIN_COOKIE, token, 60 * 60 * 24);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal masuk" }, { status: 500 });
  }
}

export async function DELETE() {
  await clearAuthCookie(ADMIN_COOKIE);
  return NextResponse.json({ ok: true });
}
