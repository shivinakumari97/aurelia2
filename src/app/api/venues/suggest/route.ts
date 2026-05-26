import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ok, handleError, parseBody } from "@/lib/api";
import { authorize } from "@/lib/auth/rbac";
import { suggestVenueSchema } from "@/lib/validation";
import { suggestVenues, type VenueCandidate } from "@/lib/ai/venue-matching";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "venue", "read");
    const body = await parseBody(req, suggestVenueSchema);

    const venues = await prisma.venue.findMany({
      where: { organizationId: ctx.organizationId },
      select: { id: true, name: true, city: true, capacity: true, basePrice: true, amenities: true },
    });

    const candidates: VenueCandidate[] = venues.map((v) => ({
      id: v.id,
      name: v.name,
      city: v.city,
      capacity: v.capacity,
      basePrice: v.basePrice ? Number(v.basePrice) : null,
      amenities: v.amenities,
    }));

    const result = await suggestVenues(
      candidates,
      {
        budget: body.budget,
        guestCount: body.guestCount,
        city: body.city,
        eventType: body.eventType,
        durationHours: body.durationHours,
      },
      ctx.organizationId,
      body.customPrompt,
    );

    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
