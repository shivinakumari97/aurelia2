import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ok, handleError, parseBody, getIp, ApiError } from "@/lib/api";
import { authorize } from "@/lib/auth/rbac";
import { classifyRsvpSchema } from "@/lib/validation";
import { classifyRsvp } from "@/lib/ai/rsvp-classifier";
import { encryptField } from "@/lib/crypto/field-encryption";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "rsvp", "update");
    const body = await parseBody(req, classifyRsvpSchema);

    const guest = await prisma.guest.findFirst({
      where: { id: body.guestId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!guest) throw new ApiError(404, "Guest not found");

    const classification = await classifyRsvp(body.replyText, ctx.organizationId);

    await prisma.guest.update({
      where: { id: guest.id },
      data: {
        rsvpStatus: classification.status,
        dietaryEnc: classification.dietary ? encryptField(classification.dietary) : undefined,
        plusOnes: classification.plusOnes,
        lastReplyText: body.replyText.slice(0, 2000),
      },
    });

    await audit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "UPDATE",
      resource: "guest",
      resourceId: guest.id,
      ip: getIp(req),
      metadata: { rsvp: classification.status, ambiguous: classification.ambiguous },
    });

    return ok({ classification });
  } catch (err) {
    return handleError(err);
  }
}
