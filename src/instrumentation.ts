/**
 * Next.js instrumentation — runs once when the server starts.
 * Restores every WhatsApp session that has saved credentials so a
 * PM2 restart / VPS reboot never disconnects registered numbers.
 * Unregistered sessions receive a fresh pairing code automatically.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { restoreAllSessions } = await import("@/lib/whatsapp");
    await restoreAllSessions();
  } catch (err) {
    console.error("[instrumentation] failed to restore WA sessions", err);
  }
}
