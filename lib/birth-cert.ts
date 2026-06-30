import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "crypto";

export function normalizeBirthCert(input: string): string {
  return input.replace(/[\s\u2010-\u2015\u2212-]/g, "").toUpperCase();
}

export function isValidBirthCert(input: string): boolean {
  return /^\d{12}$/.test(normalizeBirthCert(input));
}

export function formatBirthCertDisplay(input: string): string {
  const n = normalizeBirthCert(input);
  if (n.length !== 12) return input;
  return `${n.slice(0, 6)}-${n.slice(6, 8)}-${n.slice(8)}`;
}

function encryptionKey(): Buffer {
  const secret = process.env.BIRTH_CERT_SECRET;
  if (!secret) throw new Error("BIRTH_CERT_SECRET is not configured");
  return createHash("sha256").update(`enc:${secret}`).digest();
}

export function encryptBirthCert(normalized: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptBirthCert(encrypted: string): string {
  const buf = Buffer.from(encrypted, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function birthCertLookupKey(normalized: string): string {
  const secret = process.env.BIRTH_CERT_SECRET;
  if (!secret) throw new Error("BIRTH_CERT_SECRET is not configured");
  return createHmac("sha256", secret).update(normalized).digest("hex");
}

export function birthCertStorageFields(birthCertInput: string) {
  const normalized = normalizeBirthCert(birthCertInput);
  if (!isValidBirthCert(normalized)) {
    throw new Error("Invalid birth cert");
  }
  return {
    birthCertLookup: birthCertLookupKey(normalized),
    birthCertEncrypted: encryptBirthCert(normalized),
  };
}

export function decryptBirthCertForDisplay(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null;
  try {
    return formatBirthCertDisplay(decryptBirthCert(encrypted));
  } catch {
    return null;
  }
}
