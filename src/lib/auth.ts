import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const USER_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "sister-blast-user-secret-key-2024"
);
const ADMIN_SECRET = new TextEncoder().encode(
  process.env.ADMIN_SECRET || "sister-blast-admin-secret-key-2024"
);

export const USER_COOKIE = "sb_token";
export const ADMIN_COOKIE = "sb_admin_token";

export interface UserPayload {
  userId: string;
  type: "user";
}

export interface AdminPayload {
  adminId: string;
  type: "admin";
}

export async function signUserToken(userId: string): Promise<string> {
  return new SignJWT({ userId, type: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(USER_SECRET);
}

export async function signAdminToken(adminId: string): Promise<string> {
  return new SignJWT({ adminId, type: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(ADMIN_SECRET);
}

export async function setAuthCookie(name: string, token: string, maxAge: number) {
  const cookieStore = await cookies();
  cookieStore.set(name, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge,
    path: "/",
  });
}

export async function clearAuthCookie(name: string) {
  const cookieStore = await cookies();
  cookieStore.set(name, "", { httpOnly: true, maxAge: 0, path: "/" });
}

export async function getUserFromToken(): Promise<UserPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(USER_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, USER_SECRET);
    if (payload.type !== "user") return null;
    return { userId: payload.userId as string, type: "user" };
  } catch {
    return null;
  }
}

export async function getAdminFromToken(): Promise<AdminPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, ADMIN_SECRET);
    if (payload.type !== "admin") return null;
    return { adminId: payload.adminId as string, type: "admin" };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const payload = await getUserFromToken();
  if (!payload) return null;
  const user = await db.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.status === "BANNED") return null;
  return user;
}

export async function requireAdmin() {
  const payload = await getAdminFromToken();
  if (!payload) return null;
  const admin = await db.admin.findUnique({ where: { id: payload.adminId } });
  return admin;
}

/** Ensures the Setting singleton row exists. */
export async function getSettings() {
  let setting = await db.setting.findUnique({ where: { id: "main" } });
  if (!setting) {
    setting = await db.setting.create({
      data: {
        id: "main",
        messageTemplate:
          "Halo! Ini adalah pesan promosi dari kami. Terima kasih 🙏",
        ratePerChat: 900,
        minWithdraw: 10000,
        maintenance: false,
      },
    });
  }
  return setting;
}
