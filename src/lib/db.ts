import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Query logging hanya di development — di produksi terlalu berisik & memperlambat
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
  })

/**
 * SQLite hardening (sekali saat client dibuat):
 * - journal_mode=WAL : pembacaan tidak memblokir penulisan (blast loop + API jalan bersamaan)
 * - busy_timeout     : tulisan menunggu lock maks. 10 detik, bukan langsung error
 *   "SQLITE_BUSY / database is locked" (penyebab 500 acak saat klik Simpan Jeda)
 */
if (!globalForPrisma.prisma) {
  void db.$queryRawUnsafe('PRAGMA journal_mode=WAL;').catch(() => undefined)
  void db.$queryRawUnsafe('PRAGMA busy_timeout=10000;').catch(() => undefined)
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

const TRANSIENT_DB_ERROR = /database is locked|SQLITE_BUSY|SQLITE_LOCKED|P2024|P2017|P1017|timed out/i

const sleepMs = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Jalankan operasi DB dengan retry otomatis untuk error transient SQLite
 * (database is locked dsb). Beri jeda meningkat agar lintas proses sempat lepas.
 */
export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const msg = err instanceof Error ? err.message : String(err)
      if (!TRANSIENT_DB_ERROR.test(msg) || i === attempts - 1) throw err
      await sleepMs(300 * (i + 1))
    }
  }
  throw lastErr
}
