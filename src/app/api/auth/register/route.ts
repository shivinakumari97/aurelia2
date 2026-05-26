import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, isStrongPassword } from "@/lib/auth/password";
import { encryptField } from "@/lib/crypto/field-encryption";
import { registerSchema } from "@/lib/validation";
import { SYSTEM_ROLES } from "@/lib/auth/rbac";
import { issueSession } from "@/lib/auth/tokens";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { ok, fail, handleError, parseBody, enforceRateLimit, getIp } from "@/lib/api";

export const runtime = "nodejs";

/**
 * Register a new organization + its first admin (Event Manager).
 * Seeds the built-in system roles for the org. This is the B2B/B2C entry point:
 * an org can be a company or a single individual.
 */
export async function POST(req: NextRequest) {
  try {
    enforceRateLimit(req, "register", { limit: 5, windowMs: 60 * 60 * 1000 });
    const body = await parseBody(req, registerSchema);

    if (!isStrongPassword(body.password)) {
      return fail(
        "Password must be at least 10 characters and include upper, lower, and a number.",
        422,
      );
    }

    // Derive a unique org slug.
    let slug = slugify(body.organizationName) || "org";
    const clash = await prisma.organization.findUnique({ where: { slug } });
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 7)}`;

    const passwordHash = await hashPassword(body.password);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: body.organizationName,
          slug,
          type: body.organizationType,
          industry: body.industry ?? null,
        },
      });

      // Seed system roles.
      const roleRecords = await Promise.all(
        Object.entries(SYSTEM_ROLES).map(([name, def]) =>
          tx.role.create({
            data: {
              organizationId: org.id,
              name,
              description: def.description,
              isSystem: true,
              permissions: def.permissions as object,
            },
          }),
        ),
      );
      const adminRole = roleRecords.find((r) => r.name === "Event Manager")!;

      const user = await tx.user.create({
        data: {
          organizationId: org.id,
          email: body.email.toLowerCase(),
          name: body.name,
          phoneEnc: encryptField(body.phone),
          passwordHash,
          roleId: adminRole.id,
          isOrgAdmin: true,
        },
      });

      return { org, user };
    });

    await audit({
      organizationId: result.org.id,
      userId: result.user.id,
      action: "CREATE",
      resource: "organization",
      resourceId: result.org.id,
      ip: getIp(req),
      metadata: { type: body.organizationType },
    });

    const res = ok(
      {
        user: { id: result.user.id, name: result.user.name, email: result.user.email, isOrgAdmin: true },
        organization: { id: result.org.id, name: result.org.name, slug: result.org.slug, tier: result.org.tier },
      },
      { status: 201 },
    ) as NextResponse;

    return await issueSession(
      { id: result.user.id, organizationId: result.org.id, isOrgAdmin: true, roleId: result.user.roleId },
      res,
      { ip: getIp(req), userAgent: req.headers.get("user-agent") },
    );
  } catch (err) {
    // Unique-constraint on (org, email) is unreachable for a brand-new org,
    // but guard generically.
    return handleError(err);
  }
}
