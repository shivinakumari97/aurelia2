import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ok, handleError, ApiError, parseBody } from "@/lib/api";
import { authorize } from "@/lib/auth/rbac";
import { z } from "zod";

export const runtime = "nodejs";

const createSchema = z.object({
  eventId: z.string(),
  // Either create explicit tables, or auto-generate `count` tables of `capacity`.
  count: z.number().int().min(1).max(200).optional(),
  capacity: z.number().int().min(1).max(50).default(8),
  name: z.string().max(80).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "table", "read");
    const eventId = req.nextUrl.searchParams.get("eventId");
    if (!eventId) throw new ApiError(400, "eventId required");
    const tables = await prisma.eventTable.findMany({
      where: { eventId, organizationId: ctx.organizationId },
      orderBy: { name: "asc" },
      include: { guests: { select: { id: true, name: true, plusOnes: true } } },
    });
    return ok({ tables });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "table", "create");
    const body = await parseBody(req, createSchema);
    const event = await prisma.event.findFirst({
      where: { id: body.eventId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!event) throw new ApiError(404, "Event not found");

    if (body.count) {
      const existing = await prisma.eventTable.count({ where: { eventId: event.id } });
      await prisma.eventTable.createMany({
        data: Array.from({ length: body.count }, (_, i) => ({
          organizationId: ctx.organizationId,
          eventId: event.id,
          name: `Table ${existing + i + 1}`,
          capacity: body.capacity,
        })),
      });
      return ok({ created: body.count }, { status: 201 });
    }

    const table = await prisma.eventTable.create({
      data: {
        organizationId: ctx.organizationId,
        eventId: event.id,
        name: body.name ?? "Table",
        capacity: body.capacity,
      },
    });
    return ok({ table }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
