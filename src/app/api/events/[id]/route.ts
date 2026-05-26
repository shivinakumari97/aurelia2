import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ok, fail, handleError, parseBody, getIp, ApiError } from "@/lib/api";
import { authorize } from "@/lib/auth/rbac";
import { updateEventSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

async function loadEvent(orgId: string, id: string) {
  const event = await prisma.event.findFirst({ where: { id, organizationId: orgId } });
  if (!event) throw new ApiError(404, "Event not found");
  return event;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "event", "read");
    const { id } = await params;
    const event = await prisma.event.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: {
        venue: true,
        _count: { select: { guests: true, tasks: true, financialRecords: true, tables: true } },
      },
    });
    if (!event) return fail("Event not found", 404);
    return ok({ event });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "event", "update");
    const { id } = await params;
    await loadEvent(ctx.organizationId, id);
    const body = await parseBody(req, updateEventSchema);

    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.currentStep !== undefined ? { currentStep: body.currentStep } : {}),
        ...(body.startDate !== undefined ? { startDate: body.startDate ? new Date(body.startDate) : null } : {}),
        ...(body.endDate !== undefined ? { endDate: body.endDate ? new Date(body.endDate) : null } : {}),
        ...(body.expectedGuests !== undefined ? { expectedGuests: body.expectedGuests } : {}),
        ...(body.budget !== undefined ? { budget: body.budget } : {}),
        ...(body.location !== undefined ? { location: body.location } : {}),
        ...(body.venueId !== undefined ? { venueId: body.venueId } : {}),
        ...(body.wizardState !== undefined ? { wizardState: body.wizardState as object } : {}),
      },
    });

    await audit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "UPDATE",
      resource: "event",
      resourceId: id,
      ip: getIp(req),
      metadata: { fields: Object.keys(body) },
    });

    return ok({ event: updated });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "event", "delete");
    const { id } = await params;
    await loadEvent(ctx.organizationId, id);
    await prisma.event.delete({ where: { id } });
    await audit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "DELETE",
      resource: "event",
      resourceId: id,
      ip: getIp(req),
    });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
