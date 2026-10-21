import path from "path";
import fs from "fs";
import pino from "pino";
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
} from "@whiskeysockets/baileys";
import { db } from "@/lib/db";

const logger = pino({ level: "silent" });

export type SessionStatus =
  | "WAITING_PAIRING"
  | "PAIRING_CODE"
  | "CONNECTING"
  | "CONNECTED"
  | "DISCONNECTED";

export interface SessionRuntime {
  socket: ReturnType<typeof makeWASocket> | null;
  status: SessionStatus;
  pairingCode?: string;
  userId: string;
  phone: string;
  reconnectAttempts: number;
  starting: Promise<void> | null;
}

interface ManagerState {
  sessions: Map<string, SessionRuntime>;
}

const globalForWa = globalThis as unknown as {
  sisterBlastWa: ManagerState | undefined;
};

export const waManager: ManagerState =
  globalForWa.sisterBlastWa ?? { sessions: new Map() };
globalForWa.sisterBlastWa = waManager;

export function sessionsDir(): string {
  return process.env.SESSION_DIR || path.join(process.cwd(), "sessions");
}

export function sanitizePhone(input: string): string {
  let digits = (input || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  return digits;
}

export function normalizeJid(phone: string): string {
  return `${sanitizePhone(phone)}@s.whatsapp.net`;
}

async function removeSessionFolder(sessionId: string) {
  const dir = path.join(sessionsDir(), sessionId);
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

async function updateDbSession(sessionId: string, status: SessionStatus) {
  try {
    await db.waSession.update({ where: { id: sessionId }, data: { status } });
  } catch {
    /* row may have been deleted */
  }
}

/**
 * Boots a Baileys socket for the given session row.
 * If the credentials are not yet registered, it automatically
 * requests a pairing code for the given phone number.
 */
export async function startSocket(
  sessionId: string,
  userId: string,
  phone: string
): Promise<void> {
  const existing = waManager.sessions.get(sessionId);
  if (existing?.starting) return existing.starting;

  const runtime: SessionRuntime =
    existing ??
    ({
      socket: null,
      status: "CONNECTING",
      userId,
      phone,
      reconnectAttempts: 0,
      starting: null,
    } as SessionRuntime);
  waManager.sessions.set(sessionId, runtime);

  const boot = (async () => {
    const dir = path.join(sessionsDir(), sessionId);
    fs.mkdirSync(dir, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(dir);

    let version: [number, number, number] | undefined;
    try {
      const v = await fetchLatestBaileysVersion();
      version = v.version;
    } catch {
      /* offline fallback to built-in version */
    }

    const sock = makeWASocket({
      version,
      auth: state,
      logger,
      printQRInTerminal: false,
      browser: Browsers.ubuntu("Chrome"),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
    });

    runtime.socket = sock;
    runtime.status = "CONNECTING";
    runtime.pairingCode = undefined;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === "connecting") {
        runtime.status = "CONNECTING";
        // Request pairing code when credentials are not registered yet
        if (!(sock.authState?.creds?.registered as boolean)) {
          setTimeout(async () => {
            try {
              const code = await sock.requestPairingCode(sanitizePhone(phone));
              runtime.pairingCode = code?.toUpperCase();
              runtime.status = "PAIRING_CODE";
              await updateDbSession(sessionId, "PAIRING_CODE");
            } catch (err) {
              console.error("[WA] pairing code error", sessionId, err);
            }
          }, 3500);
        }
      }

      if (connection === "open") {
        runtime.status = "CONNECTED";
        runtime.pairingCode = undefined;
        runtime.reconnectAttempts = 0;
        await updateDbSession(sessionId, "CONNECTED");
      }

      if (connection === "close") {
        const statusCode =
          (lastDisconnect?.error as { output?: { statusCode?: number } })
            ?.output?.statusCode ?? -1;

        if (statusCode === DisconnectReason.loggedOut) {
          runtime.status = "DISCONNECTED";
          runtime.socket = null;
          waManager.sessions.delete(sessionId);
          await removeSessionFolder(sessionId);
          await updateDbSession(sessionId, "DISCONNECTED");
          return;
        }

        // Try to reconnect with backoff (max 6 attempts)
        if (runtime.reconnectAttempts < 6) {
          runtime.reconnectAttempts += 1;
          const wait = Math.min(
            3000 * runtime.reconnectAttempts,
            15000
          );
          setTimeout(() => {
            void startSocket(sessionId, userId, phone);
          }, wait);
        } else {
          runtime.status = "DISCONNECTED";
          runtime.socket = null;
          await updateDbSession(sessionId, "DISCONNECTED");
        }
      }
    });
  })();

  runtime.starting = boot;
  try {
    await boot;
  } finally {
    runtime.starting = null;
  }
}

export function getRuntime(sessionId: string): SessionRuntime | undefined {
  return waManager.sessions.get(sessionId);
}

export function getPairingCode(sessionId: string): string | undefined {
  return waManager.sessions.get(sessionId)?.pairingCode;
}

export function isConnected(sessionId: string): boolean {
  const rt = waManager.sessions.get(sessionId);
  if (!rt) return false;
  if (rt.status !== "CONNECTED" || !rt.socket) return false;
  // Socket user id (own jid) is only present once connected
  return true;
}

export async function sendText(
  sessionId: string,
  toPhone: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const rt = waManager.sessions.get(sessionId);
  if (!rt || rt.status !== "CONNECTED" || !rt.socket) {
    return { ok: false, error: "Sesi WhatsApp tidak terhubung" };
  }
  const jid = normalizeJid(toPhone);
  try {
    await rt.socket.sendMessage(jid, { text });
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal mengirim pesan";
    return { ok: false, error: msg };
  }
}

export async function logoutSession(
  sessionId: string
): Promise<{ ok: boolean }> {
  const rt = waManager.sessions.get(sessionId);
  try {
    if (rt?.socket) {
      try {
        await rt.socket.logout();
      } catch {
        try {
          rt.socket.end(undefined);
        } catch {
          /* ignore */
        }
      }
    }
  } finally {
    waManager.sessions.delete(sessionId);
    await removeSessionFolder(sessionId);
    try {
      await db.waSession.delete({ where: { id: sessionId } });
    } catch {
      /* ignore */
    }
  }
  return { ok: true };
}

/** Restore connected markers after a server restart (DB cleanup helper). */
export async function cleanupStaleDbSessions() {
  try {
    await db.waSession.updateMany({
      where: { status: { in: ["CONNECTED", "PAIRING_CODE"] } },
      data: { status: "DISCONNECTED" },
    });
  } catch {
    /* ignore */
  }
}
