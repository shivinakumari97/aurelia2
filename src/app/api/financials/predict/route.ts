import { type NextRequest } from "next/server";
import type { FinancialCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, ok, handleError, parseBody, getIp, ApiError } from "@/lib/api";
import { authorize } from "@/lib/auth/rbac";
import { predictCostSchema } from "@/lib/validation";
import { predictCosts } from "@/lib/ai/cost-prediction";
import { encryptField } from "@/lib/crypto/field-encryption";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * Generate an AI cost breakdown for an event and persist the predicted line
 * items (amounts encrypted at field level). Past-event averages from the same
 * organization feed the prediction — this is the proprietary data moat at work.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "financial", "create");
    const body = await parseBody(req, predictCostSchema);

    const event = await prisma.event.findFirst({
      where: { id: body.eventId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!event) throw new ApiError(404, "Event not found");

    // Org-scoped history: average spend per category from closed/archived events.
    // Uses the plaintext `amountBucket` (rounded) so we never decrypt in bulk.
    const grouped = await prisma.financialRecord.groupBy({
      by: ["category"],
      where: {
        organizationId: ctx.organizationId,
        isPredicted: false,
        event: { status: { in: ["CLOSED", "ARCHIVED"] } },
      },
      _avg: { amountBucket: true },
    });
    const pastAverages: Partial<Record<FinancialCategory, number>> = {};
    for (const g of grouped) {
      if (g._avg.amountBucket != null) pastAverages[g.category] = Number(g._avg.amountBucket);
    }

    const prediction = await predictCosts(
      {
        eventType: body.eventType,
        budget: body.budget,
        guestCount: body.guestCount,
        currency: body.currency,
        pastAverages,
      },
      ctx.organizationId,
    );

    // Replace prior predicted lines; keep any manually-entered records intact.
    await prisma.$transaction([
      prisma.financialRecord.deleteMany({
        where: { eventId: event.id, isPredicted: true },
      }),
      prisma.financialRecord.createMany({
        data: prediction.lines.map((l) => ({
          organizationId: ctx.organizationId,
          eventId: event.id,
          category: l.category,
          label: l.label,
          amountEnc: encryptField(String(l.amount))!,
          amountBucket: l.amount,
          currency: prediction.currency,
          isPredicted: true,
          confidence: l.confidence,
          isRisk: l.isRisk,
          notes: l.note ?? null,
        })),
      }),
    ]);

    await audit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "FINANCIAL_CHANGE",
      resource: "financialRecord",
      resourceId: event.id,
      ip: getIp(req),
      metadata: { predicted: true, total: prediction.total, aiUsed: prediction.aiUsed },
    });

    return ok({ prediction });
  } catch (err) {
    return handleError(err);
  }
}
