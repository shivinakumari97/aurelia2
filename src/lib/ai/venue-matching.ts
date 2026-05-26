import { complete } from "@/lib/ai/client";

export interface VenueCandidate {
  id: string;
  name: string;
  city: string | null;
  capacity: number | null;
  basePrice: number | null;
  amenities: string[];
}

export interface VenueQuery {
  budget?: number;
  guestCount?: number;
  city?: string;
  eventType?: string;
  durationHours?: number;
}

export interface RankedVenue {
  venueId: string;
  name: string;
  score: number; // 0..1
  budgetFit: "under" | "fits" | "over" | "unknown";
  reasons: string[];
}

export interface VenueSuggestion {
  ranked: RankedVenue[];
  reasoning: string;
  aiUsed: boolean;
}

/**
 * Deterministic scoring: capacity adequacy, budget fit, location match,
 * amenity richness. This is the always-available baseline; the LLM adds a
 * narrative reasoning summary on top.
 */
export function scoreVenues(venues: VenueCandidate[], q: VenueQuery): RankedVenue[] {
  return venues
    .map((v) => {
      const reasons: string[] = [];
      let score = 0.5;

      // Capacity
      if (q.guestCount && v.capacity != null) {
        if (v.capacity >= q.guestCount && v.capacity <= q.guestCount * 1.5) {
          score += 0.25;
          reasons.push(`Capacity ${v.capacity} comfortably fits ${q.guestCount} guests.`);
        } else if (v.capacity >= q.guestCount) {
          score += 0.1;
          reasons.push(`Capacity ${v.capacity} exceeds need (${q.guestCount}) — may feel sparse.`);
        } else {
          score -= 0.35;
          reasons.push(`Capacity ${v.capacity} is below the ${q.guestCount} guests required.`);
        }
      }

      // Budget
      let budgetFit: RankedVenue["budgetFit"] = "unknown";
      if (q.budget && v.basePrice != null) {
        const ratio = v.basePrice / q.budget;
        if (ratio <= 0.4) {
          budgetFit = "under";
          score += 0.15;
          reasons.push(`Base price leaves ample budget for vendors and catering.`);
        } else if (ratio <= 0.6) {
          budgetFit = "fits";
          score += 0.2;
          reasons.push(`Base price fits a balanced budget allocation.`);
        } else {
          budgetFit = "over";
          score -= 0.25;
          reasons.push(`Base price consumes a large share of the budget.`);
        }
      }

      // Location
      if (q.city && v.city) {
        if (v.city.toLowerCase() === q.city.toLowerCase()) {
          score += 0.15;
          reasons.push(`Located in ${v.city}, matching the requested area.`);
        } else {
          score -= 0.05;
        }
      }

      // Amenities richness
      if (v.amenities.length >= 4) {
        score += 0.05;
        reasons.push(`Rich amenities (${v.amenities.slice(0, 4).join(", ")}).`);
      }

      return {
        venueId: v.id,
        name: v.name,
        score: Math.max(0, Math.min(1, score)),
        budgetFit,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export async function suggestVenues(
  venues: VenueCandidate[],
  q: VenueQuery,
  organizationId: string,
  customPrompt?: string,
): Promise<VenueSuggestion> {
  const ranked = scoreVenues(venues, q);

  const top = ranked.slice(0, 5);
  const raw = await complete(
    `${customPrompt ? customPrompt + "\n\n" : ""}You are an event planner. Given these ranked venue candidates and the brief, write a concise 2-3 sentence reasoning summary recommending the best fit and the key tradeoff.

Brief: ${JSON.stringify(q)}
Candidates: ${JSON.stringify(top)}`,
    { organizationId, credits: 1 },
    { system: "You are a precise, budget-aware event planning assistant.", maxTokens: 350 },
  );

  if (raw) {
    return { ranked, reasoning: raw.trim(), aiUsed: true };
  }

  const best = top[0];
  const reasoning = best
    ? `Top recommendation: ${best.name} (fit score ${(best.score * 100).toFixed(0)}%). ${best.reasons[0] ?? ""} ${best.budgetFit === "fits" ? "Budget allocation looks balanced." : best.budgetFit === "over" ? "Watch the venue's share of total budget." : ""}`.trim()
    : "No venues available to rank — add venues to your inventory to receive suggestions.";

  return { ranked, reasoning, aiUsed: false };
}
