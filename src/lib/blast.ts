import { db } from "@/lib/db";
import { sendText, isConnected, sanitizePhone } from "@/lib/whatsapp";
import { getSettings } from "@/lib/auth";

export interface BlastRun {
  userId: string;
  sessionId: string;
  running: boolean;
  stopRequested: boolean;
  sent: number;
  failed: number;
  earned: number;
  startedAt: number;
  delaySec: number; // jeda aktif saat ini (detik)
  lastMessage?: string;
  lastError?: string;
}

interface BlastState {
  runs: Map<string, BlastRun>;
}

const globalForBlast = globalThis as unknown as {
  sisterBlastRunners: BlastState | undefined;
};

export const blastState: BlastState =
  globalForBlast.sisterBlastRunners ?? { runs: new Map() };
globalForBlast.sisterBlastRunners = blastState;

export function getRun(userId: string): BlastRun | undefined {
  return blastState.runs.get(userId);
}

export function stopBlast(userId: string): boolean {
  const run = blastState.runs.get(userId);
  if (!run) return false;
  run.stopRequested = true;
  return true;
}

function renderTemplate(template: string, targetPhone: string): string {
  return template
    .replaceAll("{nomor}", targetPhone)
    .replaceAll("{no}", targetPhone);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Batas aman jeda antar pesan (detik) — dipaksa di server agar nomor tidak mudah dibanned. */
export const MIN_DELAY_SEC = 3;
export const MAX_DELAY_SEC = 600;
export const DEFAULT_DELAY_SEC = 6;

export function clampDelay(v: unknown): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return DEFAULT_DELAY_SEC;
  return Math.max(MIN_DELAY_SEC, Math.min(MAX_DELAY_SEC, n));
}

/** Jeda dengan variasi acak ±20% agar pola pengiriman terlihat lebih alami di sisi WhatsApp. */
function jitteredDelayMs(delaySec: number): number {
  const jitter = delaySec * 0.2;
  const secs = delaySec + (Math.random() * 2 - 1) * jitter;
  return Math.max(1000, Math.round(secs * 1000));
}

/**
 * Background blast loop: claims one AVAILABLE target number at a time,
 * sends the admin-configured message via the user's connected session,
 * records the blast and credits the user's balance.
 */
export async function runBlastLoop(run: BlastRun) {
  const { userId, sessionId } = run;
  blastState.runs.set(userId, run);
  run.lastMessage = "Blast dimulai";

  try {
    while (!run.stopRequested) {
      const settings = await getSettings();

      if (settings.maintenance) {
        run.lastMessage = "Dihentikan: server dalam mode maintenance";
        break;
      }

      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user || user.status === "BANNED") {
        run.lastMessage = "Dihentikan: akun diblokir";
        break;
      }
      // Baca ulang jeda dari DB setiap iterasi — perubahan di UI langsung berlaku
      const delaySec = clampDelay(user.blastDelay);
      run.delaySec = delaySec;

      const session = await db.waSession.findUnique({
        where: { id: sessionId },
      });
      if (!session) {
        run.lastMessage = "Dihentikan: sesi WhatsApp tidak ditemukan";
        break;
      }

      // Atomically claim one available target number
      const claimed = await db.targetNumber.findFirst({
        where: { status: "AVAILABLE" },
        orderBy: { createdAt: "asc" },
      });
      if (!claimed) {
        run.lastMessage = "Database nomor target habis";
        break;
      }
      const claim = await db.targetNumber.updateMany({
        where: { id: claimed.id, status: "AVAILABLE" },
        data: { status: "USED" },
      });
      if (claim.count === 0) {
        continue; // someone else claimed it, loop again
      }

      const message = renderTemplate(settings.messageTemplate, claimed.phone);
      const result = await sendText(sessionId, claimed.phone, message);

      if (result.ok) {
        await db.blast.create({
          data: {
            userId,
            sessionPhone: session.phone,
            targetNumber: claimed.phone,
            message,
            status: "SENT",
            earning: settings.ratePerChat,
          },
        });
        await db.user.update({
          where: { id: userId },
          data: {
            balance: { increment: settings.ratePerChat },
            totalEarned: { increment: settings.ratePerChat },
          },
        });
        run.sent += 1;
        run.earned += settings.ratePerChat;
        run.lastMessage = `Terkirim ke ${claimed.phone}`;
      } else {
        await db.blast.create({
          data: {
            userId,
            sessionPhone: session.phone,
            targetNumber: claimed.phone,
            message,
            status: "FAILED",
            earning: 0,
            note: result.error?.slice(0, 250) || "Gagal kirim",
          },
        });
        run.failed += 1;
        run.lastError = result.error;
        run.lastMessage = `Gagal kirim ke ${claimed.phone}`;

        // If the session died, stop the run
        if (!isConnected(sessionId)) {
          run.lastMessage = "Dihentikan: sesi WhatsApp terputus";
          break;
        }
      }

      // Jeda antar pesan (diatur user, dengan variasi acak agar lebih aman)
      await sleep(run.stopRequested ? 0 : jitteredDelayMs(delaySec));
    }
  } catch (err) {
    run.lastError = err instanceof Error ? err.message : "Kesalahan tak terduga";
    run.lastMessage = "Dihentikan karena kesalahan";
  } finally {
    run.running = false;
    run.lastMessage = run.lastMessage || "Blast selesai";
    // keep the finished run briefly for the client to read final stats
    setTimeout(() => {
      const cur = blastState.runs.get(userId);
      if (cur && !cur.running && cur.startedAt === run.startedAt) {
        blastState.runs.delete(userId);
      }
    }, 60000);
  }
}

export function startBlast(
  userId: string,
  sessionId: string
): { ok: boolean; error?: string } {
  const existing = blastState.runs.get(userId);
  if (existing?.running) {
    return { ok: false, error: "Blast masih berjalan. Hentikan dulu." };
  }
  if (!isConnected(sessionId)) {
    return { ok: false, error: "Sesi WhatsApp belum terhubung" };
  }
  const run: BlastRun = {
    userId,
    sessionId,
    running: true,
    stopRequested: false,
    sent: 0,
    failed: 0,
    earned: 0,
    startedAt: Date.now(),
    delaySec: DEFAULT_DELAY_SEC,
  };
  blastState.runs.set(userId, run);
  void runBlastLoop(run);
  return { ok: true };
}

export { sanitizePhone };
