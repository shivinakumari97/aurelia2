import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ok, handleError, parseBody, getIp } from "@/lib/api";
import { authorize } from "@/lib/auth/rbac";
import { createEventSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

// List events for the caller's organization only.
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "event", "read");
    const events = await prisma.event.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        currentStep: true,
        startDate: true,
        expectedGuests: true,
        budget: true,
        currency: true,
        location: true,
        updatedAt: true,
      },
    });
    return ok({ events });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "event", "create");
    const body = await parseBody(req, createEventSchema);

    const autoCloseAt = body.endDate
      ? new Date(new Date(body.endDate).getTime() + 5 * 24 * 60 * 60 * 1000)
      : null;

    const event = await prisma.event.create({
      data: {
        organizationId: ctx.organizationId,
        createdById: ctx.userId,
        name: body.name,
        type: body.type,
        status: "PLANNING",
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        expectedGuests: body.expectedGuests ?? null,
        budget: body.budget ?? null,
        currency: body.currency,
        location: body.location ?? null,
        autoCloseAt,
      },
    });

    await audit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "CREATE",
      resource: "event",
      resourceId: event.id,
      ip: getIp(req),
    });

    return ok({ event }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
