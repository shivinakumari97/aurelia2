import { describe, it, expect } from "vitest";
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "@/lib/auth/jwt";

describe("JWT access tokens", () => {
  it("signs and verifies with the expected claims", async () => {
    const token = await signAccessToken({
      userId: "u1",
      organizationId: "org1",
      isOrgAdmin: true,
      roleId: "r1",
    });
    const claims = await verifyAccessToken(token);
    expect(claims.sub).toBe("u1");
    expect(claims.org).toBe("org1");
    expect(claims.admin).toBe(true);
    expect(claims.roleId).toBe("r1");
  });

  it("rejects a tampered token", async () => {
    const token = await signAccessToken({ userId: "u1", organizationId: "org1", isOrgAdmin: false, roleId: null });
    await expect(verifyAccessToken(token + "x")).rejects.toThrow();
  });
});

describe("refresh tokens", () => {
  it("generates an opaque token and a matching sha-256 hash", () => {
    const { token, hash } = generateRefreshToken();
    expect(token.length).toBeGreaterThan(40);
    expect(hash).toHaveLength(64);
    expect(hashRefreshToken(token)).toBe(hash);
  });
});
