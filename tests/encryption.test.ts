import { describe, it, expect } from "vitest";
import { encryptField, decryptField, blindIndex } from "@/lib/crypto/field-encryption";

describe("field encryption (AES-256-GCM)", () => {
  it("round-trips plaintext", () => {
    const secret = "dana@example.com";
    const enc = encryptField(secret);
    expect(enc).not.toBe(secret);
    expect(enc).toMatch(/^v1\./);
    expect(decryptField(enc)).toBe(secret);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptField("same value");
    const b = encryptField("same value");
    expect(a).not.toBe(b);
    expect(decryptField(a)).toBe(decryptField(b));
  });

  it("passes through null/empty", () => {
    expect(encryptField(null)).toBeNull();
    expect(encryptField(undefined)).toBeNull();
    expect(decryptField(null)).toBeNull();
  });

  it("rejects tampered ciphertext (auth tag)", () => {
    const enc = encryptField("sensitive")!;
    const parts = enc.split(".");
    // Flip a byte in the ciphertext segment.
    const data = Buffer.from(parts[3]!, "base64");
    data[0] = data[0]! ^ 0xff;
    const tampered = [parts[0], parts[1], parts[2], data.toString("base64")].join(".");
    expect(() => decryptField(tampered)).toThrow();
  });

  it("blind index is deterministic and case-insensitive", () => {
    expect(blindIndex("Dana@Example.com ")).toBe(blindIndex("dana@example.com"));
  });
});
