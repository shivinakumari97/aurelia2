import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ok, handleError, parseBody, ApiError } from "@/lib/api";
import { authorize } from "@/lib/auth/rbac";
import { optimizeSeatingSchema } from "@/lib/validation";
import { optimizeSeating, type SeatGuest, type SeatTable } from "@/lib/ai/seating";
import { decryptField } from "@/lib/crypto/field-encryption";

export const runtime = "nodejs";

/**
 * Generate an optimized seating plan for confirmed (YES) guests and persist
 * the table assignments. Locked tables are left untouched. The returned plan
 * can be overridden via drag-and-drop client-side, then locked.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "table", "update");
    const body = await parseBody(req, optimizeSeatingSchema);

    const event = await prisma.event.findFirst({
      where: { id: body.eventId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!event) throw new ApiError(404, "Event not found");

    const [guests, tables] = await Promise.all([
      prisma.guest.findMany({
        where: { eventId: event.id, organizationId: ctx.organizationId, rsvpStatus: "YES" },
        select: { id: true, name: true, groupTag: true, seatRank: true, dietaryEnc: true, plusOnes: true },
      }),
      prisma.eventTable.findMany({
        where: { eventId: event.id, organizationId: ctx.organizationId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, capacity: true, isLocked: true },
      }),
    ]);

    const seatGuests: SeatGuest[] = guests.map((g) => ({
      id: g.id,
      name: g.name,
      groupTag: g.groupTag,
      seatRank: g.seatRank,
      dietary: g.dietaryEnc ? decryptField(g.dietaryEnc) : null,
      plusOnes: g.plusOnes,
    }));
    const seatTables: SeatTable[] = tables
      .filter((t) => !t.isLocked)
      .map((t) => ({ id: t.id, name: t.name, capacity: t.capacity }));

    const plan = optimizeSeating(seatGuests, seatTables);

    // Persist assignments (only for unlocked tables).
    await prisma.$transaction(
      plan.assignments.flatMap((a) =>
        a.guestIds.map((gid) =>
          prisma.guest.update({ where: { id: gid }, data: { tableId: a.tableId } }),
        ),
      ),
    );

    return ok({ plan });
  } catch (err) {
    return handleError(err);
  }
}
