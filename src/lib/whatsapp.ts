import path from "path";
import fs from "fs";
import pino from "pino";
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
  WAProto,
} from "@whiskeysockets/baileys";
import { db } from "@/lib/db";
import { sanitizePhone, normalizeJid } from "@/lib/phone";
import { processMessageRevoke } from "@/lib/revoke";

export { sanitizePhone, normalizeJid };

const logger = pino({ level: "silent" });

export type SessionStatus =
  | "WAITING_PAIRING"
  | "PAIRING_CODE"
  | "CONNECTING"
  | "CONNECTED"
  | "DISCONNECTED";

export type AccountType = "UNKNOWN" | "PERSONAL" | "BUSINESS";

export interface SessionRuntime {
  socket: ReturnType<typeof makeWASocket> | null;
  status: SessionStatus;
  pairingCode?: string;
  accountType: AccountType;
  /** guards against concurrent requestPairingCode calls */
  pairingInProgress: boolean;
  /** true when socket is intentionally stopped (logout / regenerate) */
  closedManually: boolean;
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

const MAX_RECONNECT_ATTEMPTS = 10;
const PAIRING_MAX_RETRIES = 3;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function sessionsDir(): string {
  return process.env.SESSION_DIR || path.join(process.cwd(), "sessions");
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

async function updateAccountType(sessionId: string, accountType: AccountType) {
  try {
    await db.waSession.update({ where: { id: sessionId }, data: { accountType } });
  } catch {
    /* ignore */
  }
}

/**
 * Boots a Baileys socket for the given session row.
 *
 * Pairing strategy (reliable):
 * - The pairing code is requested when Baileys emits the `qr` event.
 *   That event fires only after the WebSocket registration session is
 *   fully established, which is the only moment requestPairingCode works.
 * - Every new `qr` (old code expired) triggers a fresh pairing code, so
 *   the code shown on the dashboard is always live.
 * - Failed requests are retried automatically (3 attempts, backoff).
 * - Works for both WhatsApp & WhatsApp Business numbers.
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
      accountType: "UNKNOWN",
      pairingInProgress: false,
      closedManually: false,
      userId,
      phone,
      reconnectAttempts: 0,
      starting: null,
    } as SessionRuntime);
  // re-booting: reset manual-close flag & pairing state
  runtime.closedManually = false;
  runtime.pairingInProgress = false;
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

    /**
     * ANTI-CHEAT: deteksi pesan blast yang DIHAPUS oleh user.
     *
     * Baileys 7 mengubah protocolMessage REVOKE menjadi event `messages.update`
     * dengan update.messageStubType = WAMessageStubType.REVOKE (=1) dan
     * key.id = ID pesan yang dihapus. Sebagai lapisan cadangan, event
     * `messages.upsert` juga diperiksa untuk protocolMessage tipe REVOKE (=0).
     */
    sock.ev.on("messages.update", (updates) => {
      try {
        for (const up of updates) {
          const stubType = up.update?.messageStubType;
          const isRevoke =
            stubType === WAProto.WebMessageInfo.StubType.REVOKE ||
            Number(stubType) === 1;
          if (!isRevoke) continue;
          const deletedId =
            (up.update?.key as { id?: string } | undefined)?.id ||
            up.key?.id ||
            null;
          const remoteJid =
            (up.update?.key as { remoteJid?: string } | undefined)?.remoteJid ||
            up.key?.remoteJid ||
            null;
          void processMessageRevoke({
            userId,
            deletedMessageId: deletedId,
            remoteJid,
          });
        }
      } catch (err) {
        console.error("[WA] revoke handler (update) error", err);
      }
    });

    sock.ev.on("messages.upsert", ({ messages }) => {
      try {
        for (const m of messages) {
          const pm = m.message?.protocolMessage as
            | { type?: number | null; key?: { id?: string; remoteJid?: string } | null }
            | undefined;
          if (!pm || Number(pm.type) !== 0 /* ProtocolMessage.Type.REVOKE */) continue;
          void processMessageRevoke({
            userId,
            deletedMessageId: pm.key?.id || null,
            remoteJid: pm.key?.remoteJid || m.key?.remoteJid || null,
          });
        }
      } catch (err) {
        console.error("[WA] revoke handler (upsert) error", err);
      }
    });

    /**
     * Ask WhatsApp for a pairing code with retry.
     * Called on every `qr` event while credentials are not registered.
     */
    const requestPairing = async () => {
      if (runtime.pairingInProgress) return;
      if (sock.authState?.creds?.registered) return;
      runtime.pairingInProgress = true;
      for (let attempt = 1; attempt <= PAIRING_MAX_RETRIES; attempt++) {
        try {
          const code = await sock.requestPairingCode(sanitizePhone(phone));
          if (code) {
            runtime.pairingCode = code.toUpperCase();
            runtime.status = "PAIRING_CODE";
            await updateDbSession(sessionId, "PAIRING_CODE");
            break;
          }
        } catch (err) {
          console.error(
            `[WA] pairing code attempt ${attempt}/${PAIRING_MAX_RETRIES} failed for session ${sessionId}`,
            err instanceof Error ? err.message : err
          );
          if (attempt < PAIRING_MAX_RETRIES) await sleep(2000 * attempt);
        }
      }
      runtime.pairingInProgress = false;
    };

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // `qr` = registration channel ready. This is the correct moment
      // to request a pairing code (fixes random pairing failures).
      if (qr && !(sock.authState?.creds?.registered as boolean)) {
        runtime.reconnectAttempts = 0; // still pairing, keep trying
        void requestPairing();
      }

      if (connection === "connecting") {
        runtime.status = "CONNECTING";
      }

      if (connection === "open") {
        runtime.status = "CONNECTED";
        runtime.pairingCode = undefined;
        runtime.reconnectAttempts = 0;
        await updateDbSession(sessionId, "CONNECTED");

        // Detect WhatsApp Business (best-effort, never blocks)
        try {
          const rawJid = sock.user?.id || "";
          const baseJid = rawJid.split(":")[0];
          if (baseJid) {
            const profile = await sock.getBusinessProfile(
              `${baseJid}@s.whatsapp.net`
            );
            const isBusiness =
              !!profile &&
              typeof profile === "object" &&
              Object.keys(profile as object).length > 0;
            runtime.accountType = isBusiness ? "BUSINESS" : "PERSONAL";
          } else {
            runtime.accountType = "UNKNOWN";
          }
        } catch {
          runtime.accountType = "UNKNOWN";
        }
        await updateAccountType(sessionId, runtime.accountType);
      }

      if (connection === "close") {
        if (runtime.closedManually) return; // intentionally stopped

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

        // Reconnect with backoff (covers 515 restart, timeouts, network)
        if (runtime.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          runtime.reconnectAttempts += 1;
          const wait = Math.min(3000 * runtime.reconnectAttempts, 15000);
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
  return true;
}

/**
 * Ends the current socket and boots a fresh one so WhatsApp issues a
 * NEW pairing code (used when the displayed code expired / failed).
 */
export async function regeneratePairingCode(
  sessionId: string
): Promise<{ ok: boolean; error?: string }> {
  const rt = waManager.sessions.get(sessionId);
  if (!rt) {
    return { ok: false, error: "Sesi belum berjalan" };
  }
  if (rt.status === "CONNECTED") {
    return { ok: false, error: "Sesi sudah terhubung, tidak perlu pairing" };
  }

  const { userId, phone } = rt;
  runtimeStop(rt);
  waManager.sessions.delete(sessionId);
  await sleep(500);
  await startSocket(sessionId, userId, phone);
  return { ok: true };
}

/** Gracefully stop a runtime socket without triggering auto-reconnect. */
function runtimeStop(rt: SessionRuntime) {
  rt.closedManually = true;
  try {
    rt.socket?.end(undefined);
  } catch {
    /* ignore */
  }
  rt.socket = null;
}

/**
 * Reconnect a disconnected session. If credentials are still registered
 * the socket resumes directly; otherwise a new pairing code is issued.
 */
export async function reconnectSession(
  sessionId: string,
  userId: string,
  phone: string
): Promise<void> {
  const rt = waManager.sessions.get(sessionId);
  if (rt?.status === "CONNECTED") return;
  if (rt) runtimeStop(rt);
  waManager.sessions.delete(sessionId);
  await startSocket(sessionId, userId, phone);
}

export async function sendText(
  sessionId: string,
  toPhone: string,
  text: string
): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const rt = waManager.sessions.get(sessionId);
  if (!rt || rt.status !== "CONNECTED" || !rt.socket) {
    return { ok: false, error: "Sesi WhatsApp tidak terhubung" };
  }
  const jid = normalizeJid(toPhone);
  try {
    const sent = await rt.socket.sendMessage(jid, { text });
    return { ok: true, messageId: sent?.key?.id || undefined };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal mengirim pesan";
    return { ok: false, error: msg };
  }
}

export async function logoutSession(
  sessionId: string
): Promise<{ ok: boolean }> {
  const rt = waManager.sessions.get(sessionId);
  if (rt) {
    runtimeStop(rt);
  }
  try {
    if (rt?.socket) {
      try {
        await rt.socket.logout();
      } catch {
        /* ignore */
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

/**
 * Called once on server boot (via instrumentation.ts):
 * - Sessions with saved credentials resume automatically (no re-pair).
 * - Unregistered sessions re-boot and receive a fresh pairing code.
 * - Rows without an auth folder are marked DISCONNECTED.
 */
export async function restoreAllSessions() {
  try {
    const rows = await db.waSession.findMany();
    const dir = sessionsDir();
    for (const row of rows) {
      const credsFile = path.join(dir, row.id, "creds.json");
      if (fs.existsSync(credsFile)) {
        await startSocket(row.id, row.userId, row.phone).catch(() => undefined);
      } else {
        await db.waSession
          .update({ where: { id: row.id }, data: { status: "DISCONNECTED" } })
          .catch(() => undefined);
      }
    }
  } catch (err) {
    console.error("[WA] restoreAllSessions failed", err);
  }
}
