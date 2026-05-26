import { type NextRequest, NextResponse } from "next/server";
import { rotateSession, clearAuthCookies } from "@/lib/auth/tokens";
import { REFRESH_COOKIE } from "@/lib/auth/session";
import { ok, fail, handleError, getIp } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const presented = req.cookies.get(REFRESH_COOKIE)?.value;
    if (!presented) return fail("No refresh token.", 401);

    const res = ok({ refreshed: true }) as NextResponse;
    const rotated = await rotateSession(presented, res, {
      ip: getIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    if (!rotated) {
      const denied = fail("Refresh token invalid or expired.", 401) as NextResponse;
      clearAuthCookies(denied);
      return denied;
    }
    return rotated;
  } catch (err) {
    return handleError(err);
  }
}
