import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sanitizePhone } from "@/lib/whatsapp";

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const phone = body.phone ? sanitizePhone(String(body.phone)) : null;
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");

    const data: { phone?: string; password?: string } = {};

    if (phone) {
      if (phone.length < 9 || phone.length > 15) {
        return NextResponse.json(
          { error: "Nomor HP tidak valid" },
          { status: 400 }
        );
      }
      data.phone = phone;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "Password baru minimal 6 karakter" },
          { status: 400 }
        );
      }
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return NextResponse.json(
          { error: "Password saat ini salah" },
          { status: 400 }
        );
      }
      data.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada perubahan" },
        { status: 400 }
      );
    }

    await db.user.update({ where: { id: user.id }, data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Gagal memperbarui profil" },
      { status: 500 }
    );
  }
}
