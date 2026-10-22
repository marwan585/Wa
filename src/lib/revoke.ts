import { db } from "@/lib/db";
import { sanitizePhone } from "@/lib/phone";

/**
 * ANTI-CHEAT: Deteksi pesan blast yang dihapus oleh user.
 *
 * Alur:
 * 1. Saat blast terkirim, ID pesan Baileys disimpan di Blast.waMessageId.
 * 2. Jika user menghapus pesan tersebut di WhatsApp-nya ("Hapus untuk semua"),
 *    Baileys memancarkan event REVOKE (via messages.update / messages.upsert).
 * 3. Handler memanggil processMessageRevoke() -> status blast jadi REVOKED
 *    dan saldo user otomatis ditarik (dikurangi) sebesar earning pesan itu.
 *
 * Catatan keamanan:
 * - Penalti bersifat atomik (updateMany dengan filter status != REVOKED)
 *   sehingga event duplikat tidak akan mengurangi saldo dua kali.
 * - Saldo boleh menjadi negatif jika user sudah menarik dana — ini disengaja
 *   sebagai pencegah kecurangan (saldo yang sudah dicairkan tetap tercatat).
 */

/** Set dedup sederhana untuk event revoke yang sama (hemat query DB). */
const processedKeys = new Set<string>();

function markProcessed(key: string) {
  processedKeys.add(key);
  // jaga memori tetap kecil
  if (processedKeys.size > 5000) {
    const iter = processedKeys.values();
    for (let i = 0; i < 1000; i++) {
      const v = iter.next().value;
      if (v !== undefined) processedKeys.delete(v);
    }
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Proses satu event penghapusan pesan.
 * Aman dipanggil berkali-kali untuk pesan yang sama (idempotent).
 */
export async function processMessageRevoke(params: {
  userId: string;
  deletedMessageId?: string | null;
  remoteJid?: string | null;
}): Promise<void> {
  const { userId } = params;
  const deletedMessageId = params.deletedMessageId || null;
  const remoteJid = params.remoteJid || null;
  if (!userId || !deletedMessageId) return;

  const key = `${userId}:${deletedMessageId}`;
  if (processedKeys.has(key)) return;

  // Baris blast mungkin belum tercatat saat event revoke tiba sangat cepat
  // (pesan dihapus sebelum loop blast selesai menulis DB) -> coba 2x.
  for (let attempt = 0; attempt < 2; attempt++) {
    const done = await tryRevokeOnce(userId, deletedMessageId, remoteJid);
    if (done !== "not-found") {
      markProcessed(key);
      return;
    }
    if (attempt === 0) await sleep(4000);
  }
  // Tidak ada baris blast yang cocok (mis. revoke pesan biasa bukan blast)
  markProcessed(key);
}

async function tryRevokeOnce(
  userId: string,
  deletedMessageId: string,
  remoteJid: string | null
): Promise<"done" | "not-found"> {
  try {
    const blast = await db.blast.findFirst({
      where: { userId, waMessageId: deletedMessageId },
    });
    if (!blast || blast.status === "REVOKED") return "done";

    // Pastikan chat sumber revoke cocok dengan nomor target blast
    if (remoteJid) {
      const chatPhone = sanitizePhone(remoteJid.split("@")[0] || "");
      if (chatPhone && chatPhone !== blast.targetNumber) return "done";
    }

    // Klaim atomik: hanya satu event yang berhasil mengubah status
    const claim = await db.blast.updateMany({
      where: { id: blast.id, status: { not: "REVOKED" } },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        note: "Pesan dihapus setelah terkirim — saldo ditarik otomatis",
      },
    });
    if (claim.count === 0) return "done"; // sudah diproses event lain

    const deduction = blast.earning;
    if (deduction > 0) {
      await db.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: deduction },
          totalEarned: { decrement: deduction },
        },
      });
    }
    console.log(
      `[BLAST][ANTI-CHEAT] user=${userId} target=${blast.targetNumber} ` +
        `pesan dihapus setelah terkirim -> saldo -${deduction}`
    );
    return "done";
  } catch (err) {
    console.error("[BLAST][ANTI-CHEAT] gagal memproses revoke", err);
    return "not-found";
  }
}
