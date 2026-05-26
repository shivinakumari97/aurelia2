import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/validation";
import { issueSession } from "@/lib/auth/tokens";
import { audit } from "@/lib/audit";
import { ok, fail, handleError, parseBody, enforceRateLimit, getIp } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    enforceRateLimit(req, "login", { limit: 10, windowMs: 15 * 60 * 1000 });
    const body = await parseBody(req, loginSchema);
    const email = body.email.toLowerCase();

    // A user's email is unique per org. Resolve candidate accounts.
    const candidates = await prisma.user.findMany({
      where: {
        email,
        ...(body.organizationSlug
          ? { organization: { slug: body.organizationSlug } }
          : {}),
      },
    });

    // Constant-ish: always run a hash comparison to reduce user enumeration.
    const dummyHash = "$2a$12$........................................................";
    const user = candidates[0];
    const valid = await verifyPassword(body.password, user?.passwordHash ?? dummyHash);

    if (!user || !valid) {
      return fail("Invalid email or password.", 401);
    }
    if (candidates.length > 1) {
      return fail(
        "This email belongs to multiple organizations. Provide organizationSlug.",
        409,
        { needsOrg: true },
      );
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: "LOGIN",
      resource: "user",
      resourceId: user.id,
      ip: getIp(req),
    });

    const res = ok({
      user: { id: user.id, name: user.name, email: user.email, isOrgAdmin: user.isOrgAdmin },
    }) as NextResponse;

    return await issueSession(
      { id: user.id, organizationId: user.organizationId, isOrgAdmin: user.isOrgAdmin, roleId: user.roleId },
      res,
      { ip: getIp(req), userAgent: req.headers.get("user-agent") },
    );
  } catch (err) {
    return handleError(err);
  }
}
