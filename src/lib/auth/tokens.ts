import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "@/lib/auth/jwt";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/session";

interface SessionUser {
  id: string;
  organizationId: string;
  isOrgAdmin: boolean;
  roleId: string | null;
}

const refreshTtlMs = () => env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

function setCookies(res: NextResponse, access: string, refresh: string) {
  const secure = env.isProd;
  res.cookies.set(ACCESS_COOKIE, access, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: Number(env.ACCESS_TOKEN_TTL),
  });
  res.cookies.set(REFRESH_COOKIE, refresh, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
  });
}

/** Issue a fresh access + refresh token pair and attach them as cookies. */
export async function issueSession(
  user: SessionUser,
  res: NextResponse,
  meta: { ip?: string | null; userAgent?: string | null },
): Promise<NextResponse> {
  const access = await signAccessToken({
    userId: user.id,
    organizationId: user.organizationId,
    isOrgAdmin: user.isOrgAdmin,
    roleId: user.roleId,
  });
  const { token: refresh, hash } = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + refreshTtlMs()),
      createdByIp: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });

  setCookies(res, access, refresh);
  return res;
}

/**
 * Rotate a refresh token: validate the presented token, revoke it, and issue
 * a new pair. Reuse of an already-revoked token is treated as compromise and
 * revokes the whole chain for that user.
 */
export async function rotateSession(
  presentedToken: string,
  res: NextResponse,
  meta: { ip?: string | null; userAgent?: string | null },
): Promise<NextResponse | null> {
  const hash = hashRefreshToken(presentedToken);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash: hash },
    include: { user: true },
  });

  if (!existing || existing.expiresAt < new Date()) return null;

  // Reuse detection: a revoked token presented again => revoke all user tokens.
  if (existing.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return null;
  }

  const { token: newToken, hash: newHash } = generateRefreshToken();
  const created = await prisma.refreshToken.create({
    data: {
      organizationId: existing.organizationId,
      userId: existing.userId,
      tokenHash: newHash,
      expiresAt: new Date(Date.now() + refreshTtlMs()),
      createdByIp: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date(), replacedById: created.id },
  });

  const access = await signAccessToken({
    userId: existing.user.id,
    organizationId: existing.user.organizationId,
    isOrgAdmin: existing.user.isOrgAdmin,
    roleId: existing.user.roleId,
  });

  setCookies(res, access, newToken);
  return res;
}

export async function revokeSession(presentedToken: string | undefined): Promise<void> {
  if (!presentedToken) return;
  const hash = hashRefreshToken(presentedToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function clearAuthCookies(res: NextResponse): void {
  res.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { path: "/api/auth", maxAge: 0 });
}
