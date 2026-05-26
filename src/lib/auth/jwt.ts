import crypto from "node:crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "@/lib/env";

const accessKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const ISSUER = "aurelia";
const AUDIENCE = "aurelia-app";

export interface AccessClaims extends JWTPayload {
  sub: string; // userId
  org: string; // organizationId
  admin: boolean;
  roleId: string | null;
}

/** Mint a short-lived access token. */
export async function signAccessToken(claims: {
  userId: string;
  organizationId: string;
  isOrgAdmin: boolean;
  roleId: string | null;
}): Promise<string> {
  const ttl = Number(env.ACCESS_TOKEN_TTL);
  return new SignJWT({
    org: claims.organizationId,
    admin: claims.isOrgAdmin,
    roleId: claims.roleId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(accessKey);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, accessKey, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return payload as AccessClaims;
}

/**
 * Refresh tokens are opaque random strings (not JWTs). We store only their
 * SHA-256 hash, enabling rotation + revocation without keeping the secret.
 */
export function generateRefreshToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(48).toString("base64url");
  const hash = hashRefreshToken(token);
  return { token, hash };
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
