/** Utilitas nomor telepon — dipisah agar bebas circular import. */

export function sanitizePhone(input: string): string {
  let digits = (input || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  return digits;
}

export function normalizeJid(phone: string): string {
  return `${sanitizePhone(phone)}@s.whatsapp.net`;
}
