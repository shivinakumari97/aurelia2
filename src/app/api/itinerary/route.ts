import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ok, handleError, ApiError, parseBody, getIp } from "@/lib/api";
import { authorize } from "@/lib/auth/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const runtime = "nodejs";

const itemSchema = z.object({
  time: z.string().max(20),
  title: z.string().max(200),
  durationMin: z.number().int().min(0).max(1440).optional(),
  owner: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});

const upsertSchema = z.object({
  eventId: z.string(),
  title: z.string().max(160).optional(),
  items: z.array(itemSchema).max(200),
  menu: z.array(z.object({ course: z.string().max(80), item: z.string().max(200) })).max(100).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "itinerary", "read");
    const eventId = req.nextUrl.searchParams.get("eventId");
    if (!eventId) throw new ApiError(400, "eventId required");
    const itinerary = await prisma.itinerary.findFirst({
      where: { eventId, organizationId: ctx.organizationId },
      orderBy: { revision: "desc" },
    });
    return ok({ itinerary });
  } catch (err) {
    return handleError(err);
  }
}

// Upsert creates a new revision (version control) rather than mutating in place.
export async function PUT(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "itinerary", "update");
    const body = await parseBody(req, upsertSchema);
    const event = await prisma.event.findFirst({
      where: { id: body.eventId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!event) throw new ApiError(404, "Event not found");

    const latest = await prisma.itinerary.findFirst({
      where: { eventId: event.id, organizationId: ctx.organizationId },
      orderBy: { revision: "desc" },
      select: { revision: true },
    });

    const itinerary = await prisma.itinerary.create({
      data: {
        organizationId: ctx.organizationId,
        eventId: event.id,
        title: body.title ?? "Day-of schedule",
        items: body.items as object,
        menu: (body.menu ?? []) as object,
        revision: (latest?.revision ?? 0) + 1,
      },
    });

    await audit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "UPDATE",
      resource: "itinerary",
      resourceId: itinerary.id,
      ip: getIp(req),
      metadata: { revision: itinerary.revision },
    });

    return ok({ itinerary });
  } catch (err) {
    return handleError(err);
  }
}
