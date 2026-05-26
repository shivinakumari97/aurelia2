import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ok, handleError, parseBody, getIp } from "@/lib/api";
import { authorize } from "@/lib/auth/rbac";
import { createVenueSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "venue", "read");
    const venues = await prisma.venue.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { name: "asc" },
    });
    return ok({ venues });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "venue", "create");
    const body = await parseBody(req, createVenueSchema);
    const venue = await prisma.venue.create({
      data: {
        organizationId: ctx.organizationId,
        name: body.name,
        location: body.location ?? null,
        city: body.city ?? null,
        capacity: body.capacity ?? null,
        basePrice: body.basePrice ?? null,
        currency: body.currency,
        amenities: body.amenities,
        description: body.description ?? null,
      },
    });
    await audit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "CREATE",
      resource: "venue",
      resourceId: venue.id,
      ip: getIp(req),
    });
    return ok({ venue }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
