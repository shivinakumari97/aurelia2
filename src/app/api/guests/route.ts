import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ok, handleError, ApiError } from "@/lib/api";
import { authorize } from "@/lib/auth/rbac";
import { decryptField } from "@/lib/crypto/field-encryption";

export const runtime = "nodejs";

// List guests for an event (tenant-scoped). Dietary is decrypted for display
// only when the caller can read RSVPs.
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "rsvp", "read");
    const eventId = req.nextUrl.searchParams.get("eventId");
    if (!eventId) throw new ApiError(400, "eventId required");

    const guests = await prisma.guest.findMany({
      where: { eventId, organizationId: ctx.organizationId },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, rsvpStatus: true, plusOnes: true,
        groupTag: true, dietaryEnc: true, lastReplyText: true,
      },
    });

    return ok({
      guests: guests.map((g) => ({
        id: g.id,
        name: g.name,
        rsvpStatus: g.rsvpStatus,
        plusOnes: g.plusOnes,
        groupTag: g.groupTag,
        dietary: g.dietaryEnc ? decryptField(g.dietaryEnc) : null,
        lastReplyText: g.lastReplyText,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
