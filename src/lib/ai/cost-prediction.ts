import type { FinancialCategory } from "@prisma/client";
import { complete, extractJson } from "@/lib/ai/client";

export interface CostLine {
  category: FinancialCategory;
  label: string;
  amount: number;
  confidence: number; // 0..1
  isRisk: boolean;
  note?: string;
}

export interface CostPrediction {
  currency: string;
  lines: CostLine[];
  total: number;
  budget?: number;
  overBudget: boolean;
  aiUsed: boolean;
}

// Typical share of total budget by category, by event type. Used as the
// deterministic baseline and as priors the LLM can refine.
const PROFILES: Record<string, Partial<Record<FinancialCategory, number>>> = {
  WEDDING: { VENUE: 0.3, CATERING: 0.28, DECOR: 0.12, ENTERTAINMENT: 0.08, STAFFING: 0.07, AV: 0.05, TRANSPORT: 0.03, CONTINGENCY: 0.07 },
  CORPORATE: { VENUE: 0.25, CATERING: 0.22, AV: 0.18, STAFFING: 0.1, MARKETING: 0.08, ENTERTAINMENT: 0.05, TRANSPORT: 0.04, CONTINGENCY: 0.08 },
  GALA: { VENUE: 0.28, CATERING: 0.27, ENTERTAINMENT: 0.12, DECOR: 0.12, STAFFING: 0.08, AV: 0.05, CONTINGENCY: 0.08 },
  CONFERENCE: { VENUE: 0.3, AV: 0.2, CATERING: 0.18, STAFFING: 0.1, MARKETING: 0.07, TRANSPORT: 0.05, CONTINGENCY: 0.1 },
  DEFAULT: { VENUE: 0.3, CATERING: 0.25, STAFFING: 0.1, AV: 0.1, DECOR: 0.08, ENTERTAINMENT: 0.07, CONTINGENCY: 0.1 },
};

const LABELS: Partial<Record<FinancialCategory, string>> = {
  VENUE: "Venue & rental",
  CATERING: "Catering & beverage",
  STAFFING: "Event staffing",
  AV: "Audio / visual & production",
  DECOR: "Décor & floral",
  ENTERTAINMENT: "Entertainment",
  TRANSPORT: "Transport & logistics",
  MARKETING: "Marketing & invitations",
  CONTINGENCY: "Contingency reserve",
  OTHER: "Other",
};

/**
 * Deterministic baseline: distribute the budget across categories using the
 * event-type profile. Flags any category exceeding its expected band as a risk.
 */
export function predictCostsBaseline(input: {
  eventType: string;
  budget: number;
  currency?: string;
  pastAverages?: Partial<Record<FinancialCategory, number>>;
}): CostPrediction {
  const profile = PROFILES[input.eventType] ?? PROFILES.DEFAULT!;
  const lines: CostLine[] = (Object.entries(profile) as [FinancialCategory, number][]).map(
    ([category, share]) => {
      const past = input.pastAverages?.[category];
      const modeled = input.budget * share;
      // Blend modeled estimate with organization history when available.
      const amount = past != null ? Math.round((modeled + past) / 2) : Math.round(modeled);
      const confidence = past != null ? 0.8 : 0.55;
      const isRisk = past != null && modeled > past * 1.25;
      return {
        category,
        label: LABELS[category] ?? category,
        amount,
        confidence,
        isRisk,
        note: past != null ? "Blended with your past event averages." : "Modeled from event-type profile.",
      };
    },
  );

  const total = lines.reduce((s, l) => s + l.amount, 0);
  return {
    currency: input.currency ?? "USD",
    lines,
    total,
    budget: input.budget,
    overBudget: total > input.budget,
    aiUsed: false,
  };
}

export async function predictCosts(
  input: {
    eventType: string;
    budget: number;
    guestCount?: number;
    currency?: string;
    pastAverages?: Partial<Record<FinancialCategory, number>>;
  },
  organizationId: string,
): Promise<CostPrediction> {
  const baseline = predictCostsBaseline(input);

  const raw = await complete(
    `Refine this event cost breakdown. Keep categories from the baseline. Respond ONLY with JSON:
{"lines":[{"category":"VENUE","amount":number,"confidence":0..1,"isRisk":boolean,"note":string}]}

Event: type=${input.eventType}, budget=${input.budget} ${input.currency ?? "USD"}, guests=${input.guestCount ?? "?"}.
Baseline: ${JSON.stringify(baseline.lines.map((l) => ({ category: l.category, amount: l.amount })))}`,
    { organizationId, credits: 1 },
    { system: "You are a financial planning assistant for events. Be realistic and flag risk areas where a category is likely to overrun.", maxTokens: 700 },
  );

  const parsed = extractJson<{ lines: Partial<CostLine>[] }>(raw);
  if (!parsed?.lines?.length) return baseline;

  const byCat = new Map(baseline.lines.map((l) => [l.category, l]));
  for (const ln of parsed.lines) {
    if (!ln.category) continue;
    const base = byCat.get(ln.category as FinancialCategory);
    if (!base) continue;
    if (typeof ln.amount === "number") base.amount = Math.round(ln.amount);
    if (typeof ln.confidence === "number") base.confidence = ln.confidence;
    if (typeof ln.isRisk === "boolean") base.isRisk = ln.isRisk;
    if (ln.note) base.note = ln.note;
  }

  const lines = Array.from(byCat.values());
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return {
    currency: input.currency ?? "USD",
    lines,
    total,
    budget: input.budget,
    overBudget: total > input.budget,
    aiUsed: true,
  };
}
