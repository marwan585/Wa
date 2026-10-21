import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signUserToken, setAuthCookie, USER_COOKIE } from "@/lib/auth";
import { sanitizePhone } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const username = String(body.username || "").trim();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Format email tidak valid" },
        { status: 400 }
      );
    }
    if (!username || username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: "Username minimal 3 karakter dan maksimal 20 karakter" },
        { status: 400 }
      );
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: "Username hanya boleh huruf, angka, dan underscore" },
        { status: 400 }
      );
    }
    const cleanPhone = sanitizePhone(phone);
    if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      return NextResponse.json(
        { error: "Nomor HP tidak valid (contoh: 6281234567890)" },
        { status: 400 }
      );
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 }
      );
    }

    const existEmail = await db.user.findUnique({ where: { email } });
    if (existEmail) {
      return NextResponse.json(
        { error: "Email sudah terdaftar" },
        { status: 400 }
      );
    }
    const existUsername = await db.user.findUnique({ where: { username } });
    if (existUsername) {
      return NextResponse.json(
        { error: "Username sudah dipakai" },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: { email, username, phone: cleanPhone, password: hashed },
    });

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
      { error: "Gagal mendaftar, coba lagi" },
      { status: 500 }
    );
  }
}
