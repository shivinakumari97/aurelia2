import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ok, handleError, parseBody, getIp, ApiError } from "@/lib/api";
import { authorize } from "@/lib/auth/rbac";
import { importGuestsSchema } from "@/lib/validation";
import { encryptField } from "@/lib/crypto/field-encryption";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

// Bulk-import a guest list (parsed CSV rows). Contact PII is encrypted at rest.
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "rsvp", "create");
    const body = await parseBody(req, importGuestsSchema);

    const event = await prisma.event.findFirst({
      where: { id: body.eventId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!event) throw new ApiError(404, "Event not found");

    const created = await prisma.guest.createMany({
      data: body.guests.map((g) => ({
        organizationId: ctx.organizationId,
        eventId: event.id,
        name: g.name,
        emailEnc: g.email ? encryptField(g.email) : null,
        phoneEnc: g.phone ? encryptField(g.phone) : null,
        groupTag: g.groupTag ?? null,
        seatRank: g.seatRank ?? null,
      })),
    });

    await audit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "CREATE",
      resource: "guest",
      resourceId: event.id,
      ip: getIp(req),
      metadata: { imported: created.count },
    });

    return ok({ imported: created.count }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
