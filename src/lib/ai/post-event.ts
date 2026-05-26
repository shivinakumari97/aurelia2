import { complete } from "@/lib/ai/client";

export interface ReportInput {
  eventName: string;
  eventType: string;
  budget: number | null;
  actualTotal: number;
  byCategory: { category: string; planned: number; actual: number }[];
  invited: number;
  attended: number;
}

export interface PostEventReport {
  budgetVariance: {
    planned: number | null;
    actual: number;
    variancePct: number | null;
    byCategory: { category: string; planned: number; actual: number; variancePct: number }[];
  };
  attendanceRate: number | null;
  summary: string;
  suggestions: string[];
}

/** Deterministic report; AI adds a narrative summary when available. */
export async function generateReport(
  input: ReportInput,
  organizationId: string,
): Promise<PostEventReport> {
  const variancePct =
    input.budget && input.budget > 0
      ? Math.round(((input.actualTotal - input.budget) / input.budget) * 1000) / 10
      : null;

  const byCategory = input.byCategory.map((c) => ({
    ...c,
    variancePct: c.planned > 0 ? Math.round(((c.actual - c.planned) / c.planned) * 1000) / 10 : 0,
  }));

  const attendanceRate =
    input.invited > 0 ? Math.round((input.attended / input.invited) * 1000) / 10 : null;

  const suggestions: string[] = [];
  for (const c of byCategory) {
    if (c.variancePct > 15) suggestions.push(`${c.category} ran ${c.variancePct}% over plan — tighten quotes or add contingency next time.`);
    if (c.variancePct < -15) suggestions.push(`${c.category} came in ${Math.abs(c.variancePct)}% under — budget can be reallocated in future events.`);
  }
  if (attendanceRate != null && attendanceRate < 70) {
    suggestions.push(`Attendance was ${attendanceRate}% — consider earlier reminders and follow-ups to lift turnout.`);
  }
  if (suggestions.length === 0) suggestions.push("Event tracked closely to plan. Capture vendor notes to keep improving estimates.");

  const fallbackSummary =
    `${input.eventName} (${input.eventType}) finished at ${input.actualTotal.toLocaleString()} vs a ${input.budget ? input.budget.toLocaleString() : "—"} budget` +
    (variancePct != null ? ` (${variancePct >= 0 ? "+" : ""}${variancePct}%).` : ".") +
    (attendanceRate != null ? ` Attendance rate was ${attendanceRate}%.` : "");

  const raw = await complete(
    `Write a concise 3-4 sentence post-event executive summary.
Data: ${JSON.stringify({ ...input, variancePct, attendanceRate })}`,
    { organizationId, credits: 1 },
    { system: "You are an analyst writing crisp post-event executive summaries for event companies.", maxTokens: 350 },
  );

  return {
    budgetVariance: { planned: input.budget, actual: input.actualTotal, variancePct, byCategory },
    attendanceRate,
    summary: raw?.trim() || fallbackSummary,
    suggestions,
  };
}
