import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ok, handleError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        tier: true,
        aiCreditsUsed: true,
        aiCreditsLimit: true,
      },
    });
    const role = ctx.roleId
      ? await prisma.role.findUnique({ where: { id: ctx.roleId }, select: { name: true } })
      : null;

    return ok({
      user: {
        id: ctx.userId,
        name: ctx.name,
        email: ctx.email,
        isOrgAdmin: ctx.isOrgAdmin,
        roleName: role?.name ?? null,
        permissions: ctx.permissions,
      },
      organization: org,
    });
  } catch (err) {
    return handleError(err);
  }
}
