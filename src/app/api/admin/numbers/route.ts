import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sanitizePhone } from "@/lib/whatsapp";

interface ImportItem {
  phone?: string;
  country?: string;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = 50;

  const where: Record<string, unknown> = {};
  if (status === "AVAILABLE" || status === "USED") where.status = status;

  const [items, total, available, used] = await Promise.all([
    db.targetNumber.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.targetNumber.count({ where }),
    db.targetNumber.count({ where: { status: "AVAILABLE" } }),
    db.targetNumber.count({ where: { status: "USED" } }),
  ]);

  return NextResponse.json({
    items,
    total,
    available,
    used,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

/**
 * Import target numbers in JSON format.
 * Accepted shapes:
 *   ["6281234567890", ...]
 *   [{ "phone": "6281234567890", "country": "62" }, ...]
 *   { "numbers": [...], "country": "62" }
 * When a country code is supplied and a number does not start with it,
 * the code is prepended automatically.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const defaultCountry = body.country ? String(body.country).replace(/\D/g, "") : "";

    let rawList: Array<string | ImportItem> = [];
    if (Array.isArray(body.numbers)) rawList = body.numbers;
    else if (Array.isArray(body)) rawList = body;

    if (rawList.length === 0) {
      return NextResponse.json(
        { error: "Format JSON tidak dikenali. Contoh: [\"6281234567890\"]" },
        { status: 400 }
      );
    }
    if (rawList.length > 5000) {
      return NextResponse.json(
        { error: "Maksimal 5000 nomor per impor" },
        { status: 400 }
      );
    }

    const phones = new Set<string>();
    let invalid = 0;
    for (const item of rawList) {
      let phone = "";
      let country = defaultCountry;
      if (typeof item === "string") {
        phone = item;
      } else if (item && typeof item === "object") {
        phone = String(item.phone || "");
        if (item.country) country = String(item.country).replace(/\D/g, "");
      }
      let clean = sanitizePhone(phone);
      if (!clean) {
        invalid++;
        continue;
      }
      if (country && !clean.startsWith(country)) clean = country + clean;
      if (clean.length < 8 || clean.length > 15) {
        invalid++;
        continue;
      }
      phones.add(clean);
    }

    if (phones.size === 0) {
      return NextResponse.json(
        { error: "Tidak ada nomor valid dalam data impor" },
        { status: 400 }
      );
    }

    const inserted = await db.$transaction(async (tx) => {
      let count = 0;
      for (const phone of phones) {
        const exists = await tx.targetNumber.findUnique({ where: { phone } });
        if (exists) continue;
        await tx.targetNumber.create({
          data: { phone, country: phone.slice(0, 2) },
        });
        count++;
      }
      return count;
    });

    return NextResponse.json({
      ok: true,
      inserted,
      duplicates: phones.size - inserted,
      invalid,
    });
  } catch {
    return NextResponse.json(
      { error: "JSON tidak valid" },
      { status: 400 }
    );
  }
}

/** Add a single number manually. */
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  const body = await req.json();
  const phone = sanitizePhone(String(body.phone || ""));
  if (phone.length < 8 || phone.length > 15) {
    return NextResponse.json(
      { error: "Nomor tidak valid. Gunakan format kode negara, contoh 6281234567890" },
      { status: 400 }
    );
  }
  const exists = await db.targetNumber.findUnique({ where: { phone } });
  if (exists) {
    return NextResponse.json({ error: "Nomor sudah ada" }, { status: 400 });
  }
  await db.targetNumber.create({ data: { phone, country: phone.slice(0, 2) } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "";

  if (mode === "used") {
    await db.targetNumber.deleteMany({ where: { status: "USED" } });
    return NextResponse.json({ ok: true });
  }
  if (mode === "all") {
    await db.targetNumber.deleteMany({});
    return NextResponse.json({ ok: true });
  }
  const id = searchParams.get("id");
  if (id) {
    await db.targetNumber.delete({ where: { id } }).catch(() => undefined);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Mode tidak dikenal" }, { status: 400 });
}
