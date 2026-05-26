import { type NextRequest } from "next/server";
import type { FinancialCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, ok, handleError, getIp, ApiError } from "@/lib/api";
import { authorize } from "@/lib/auth/rbac";
import { generateReport } from "@/lib/ai/post-event";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * Close an event: mark CLOSED, generate the AI post-event report (budget
 * variance, attendance, suggestions), and persist it. Financial records remain
 * stored to inform future cost predictions (the data moat).
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "closure", "update");
    const { id } = await params;

    const event = await prisma.event.findFirst({
      where: { id, organizationId: ctx.organizationId },
    });
    if (!event) throw new ApiError(404, "Event not found");

    // Aggregate financials by category using plaintext buckets.
    const [planned, actual, invited, attended] = await Promise.all([
      prisma.financialRecord.groupBy({
        by: ["category"],
        where: { eventId: id, isPredicted: true },
        _sum: { amountBucket: true },
      }),
      prisma.financialRecord.groupBy({
        by: ["category"],
        where: { eventId: id, isPredicted: false },
        _sum: { amountBucket: true },
      }),
      prisma.guest.count({ where: { eventId: id } }),
      prisma.guest.count({ where: { eventId: id, rsvpStatus: "YES" } }),
    ]);

    const plannedMap = new Map(planned.map((p) => [p.category, Number(p._sum.amountBucket ?? 0)]));
    const actualMap = new Map(actual.map((a) => [a.category, Number(a._sum.amountBucket ?? 0)]));
    const categories = new Set<FinancialCategory>([...plannedMap.keys(), ...actualMap.keys()]);
    const byCategory = Array.from(categories).map((c) => ({
      category: c,
      planned: plannedMap.get(c) ?? 0,
      actual: actualMap.get(c) ?? 0,
    }));
    const actualTotal = byCategory.reduce((s, c) => s + c.actual, 0);

    const report = await generateReport(
      {
        eventName: event.name,
        eventType: event.type,
        budget: event.budget ? Number(event.budget) : null,
        actualTotal,
        byCategory,
        invited,
        attended,
      },
      ctx.organizationId,
    );

    const now = new Date();
    await prisma.$transaction([
      prisma.event.update({
        where: { id },
        data: { status: "CLOSED", closedAt: now, currentStep: "CLOSURE" },
      }),
      prisma.postEventReport.upsert({
        where: { eventId: id },
        create: {
          organizationId: ctx.organizationId,
          eventId: id,
          budgetVariance: report.budgetVariance as object,
          attendanceRate: report.attendanceRate,
          summary: report.summary,
          suggestions: report.suggestions,
        },
        update: {
          budgetVariance: report.budgetVariance as object,
          attendanceRate: report.attendanceRate,
          summary: report.summary,
          suggestions: report.suggestions,
        },
      }),
    ]);

    await audit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "UPDATE",
      resource: "event",
      resourceId: id,
      ip: getIp(req),
      metadata: { closed: true },
    });

    return ok({ report });
  } catch (err) {
    return handleError(err);
  }
}
