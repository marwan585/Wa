import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signUserToken, setAuthCookie, USER_COOKIE } from "@/lib/auth";

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

    const user = await db.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 }
      );
    }

    if (user.status === "BANNED") {
      return NextResponse.json(
        { error: "Akun Anda diblokir. Hubungi admin." },
        { status: 403 }
      );
    }

    const token = await signUserToken(user.id);
    await setAuthCookie(USER_COOKIE, token, 60 * 60 * 24 * 7);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        phone: user.phone,
        balance: user.balance,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal masuk, coba lagi" },
      { status: 500 }
    );
  }
}
