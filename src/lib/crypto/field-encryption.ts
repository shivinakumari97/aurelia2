import crypto from "node:crypto";
import { env } from "@/lib/env";

/**
 * Field-level encryption for sensitive data at rest (guest contact details,
 * dietary restrictions, financial values, vendor contracts).
 *
 * Algorithm: AES-256-GCM (authenticated encryption).
 * Ciphertext envelope (base64): v1.<iv>.<authTag>.<ciphertext>
 *
 * The key is a 32-byte value supplied via FIELD_ENCRYPTION_KEY (base64 or hex).
 * Rotate by introducing a new version prefix and keeping old keys for decrypt.
 */

const VERSION = "v1";

function loadKey(): Buffer {
  const raw = env.FIELD_ENCRYPTION_KEY;
  // Accept base64 or hex; must decode to exactly 32 bytes.
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    key = Buffer.from(raw, "base64");
  }
  if (key.length !== 32) {
    throw new Error(
      `FIELD_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}).`,
    );
  }
  return key;
}

let cachedKey: Buffer | null = null;
function key(): Buffer {
  if (!cachedKey) cachedKey = loadKey();
  return cachedKey;
}

/** Encrypt a plaintext string. Returns null for null/undefined input. */
export function encryptField(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === "") return plaintext ?? null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

/** Decrypt an envelope produced by encryptField. Returns null for null input. */
export function decryptField(envelope: string | null | undefined): string | null {
  if (envelope == null || envelope === "") return null;
  const parts = envelope.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Malformed or unsupported ciphertext envelope");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64!, "base64");
  const authTag = Buffer.from(tagB64!, "base64");
  const data = Buffer.from(dataB64!, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return plaintext.toString("utf8");
}

/** Deterministic blind index (HMAC) for equality search over encrypted fields. */
export function blindIndex(plaintext: string): string {
  return crypto.createHmac("sha256", key()).update(plaintext.toLowerCase().trim()).digest("hex");
}
