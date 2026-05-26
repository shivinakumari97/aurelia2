import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth/jwt";
import type { PermissionMap, Principal } from "@/lib/auth/rbac";

export const ACCESS_COOKIE = "aurelia_access";
export const REFRESH_COOKIE = "aurelia_refresh";

export interface AuthContext extends Principal {
  email: string;
  name: string;
  roleId: string | null;
}

/**
 * Resolve the authenticated principal from the access token.
 *
 * Reads the bearer token from the Authorization header or the access cookie.
 * Returns null when unauthenticated. Loads the user's role permissions so
 * downstream handlers can authorize and tenant-scope queries.
 */
export async function getAuthContext(req?: NextRequest): Promise<AuthContext | null> {
  let token: string | undefined;

  const header = req?.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    token = header.slice(7);
  }
  if (!token) {
    const store = req ? req.cookies : await cookies();
    token = store.get(ACCESS_COOKIE)?.value;
  }
  if (!token) return null;

  let claims;
  try {
    claims = await verifyAccessToken(token);
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    include: { role: true },
  });
  if (!user || user.organizationId !== claims.org) return null;

  const permissions = (user.role?.permissions ?? {}) as PermissionMap;

  return {
    userId: user.id,
    organizationId: user.organizationId,
    isOrgAdmin: user.isOrgAdmin,
    permissions,
    email: user.email,
    name: user.name,
    roleId: user.roleId,
  };
}
