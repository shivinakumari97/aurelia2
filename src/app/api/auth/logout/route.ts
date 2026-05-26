import { type NextRequest, NextResponse } from "next/server";
import { revokeSession, clearAuthCookies } from "@/lib/auth/tokens";
import { REFRESH_COOKIE, getAuthContext } from "@/lib/auth/session";
import { ok, handleError, getIp } from "@/lib/api";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    await revokeSession(req.cookies.get(REFRESH_COOKIE)?.value);
    if (ctx) {
      await audit({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: "LOGOUT",
        resource: "user",
        resourceId: ctx.userId,
        ip: getIp(req),
      });
    }
    const res = ok({ loggedOut: true }) as NextResponse;
    clearAuthCookies(res);
    return res;
  } catch (err) {
    return handleError(err);
  }
}
