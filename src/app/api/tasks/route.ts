import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ok, handleError, parseBody, getIp } from "@/lib/api";
import { authorize } from "@/lib/auth/rbac";
import { createTaskSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "task", "read");
    const eventId = req.nextUrl.searchParams.get("eventId") ?? undefined;
    const tasks = await prisma.task.findMany({
      where: { organizationId: ctx.organizationId, ...(eventId ? { eventId } : {}) },
      orderBy: [{ status: "asc" }, { priority: "asc" }, { dueDate: "asc" }],
      include: { assignee: { select: { id: true, name: true } } },
    });
    return ok({ tasks });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "task", "create");
    const body = await parseBody(req, createTaskSchema);

    // Validate cross-references stay within the tenant.
    if (body.eventId) {
      const e = await prisma.event.findFirst({
        where: { id: body.eventId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!e) return ok({ error: "event not found" }, { status: 404 });
    }

    const task = await prisma.task.create({
      data: {
        organizationId: ctx.organizationId,
        eventId: body.eventId ?? null,
        title: body.title,
        description: body.description ?? null,
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        assigneeId: body.assigneeId ?? null,
      },
    });

    await audit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "CREATE",
      resource: "task",
      resourceId: task.id,
      ip: getIp(req),
    });

    return ok({ task }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
