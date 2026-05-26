import type { RsvpStatus } from "@prisma/client";
import { complete, extractJson } from "@/lib/ai/client";

export interface RsvpClassification {
  status: RsvpStatus;
  confidence: number; // 0..1
  dietary: string | null;
  plusOnes: number;
  ambiguous: boolean;
  suggestedFollowUp: string | null;
}

const YES = /\b(yes|yep|yeah|attending|count me in|i'?ll be there|we'?ll be there|confirm|see you|wouldn'?t miss|excited to|happy to attend)\b/i;
const NO = /\b(no|can'?t make it|cannot make it|unable to attend|won'?t be able|regret|decline|not attending|sorry.*miss|unfortunately.*can'?t)\b/i;
const MAYBE = /\b(maybe|might|possibly|not sure|tentative|trying to|hope to|depends|will try|let you know)\b/i;

const DIETARY = [
  "vegetarian", "vegan", "gluten[- ]?free", "gluten free", "halal", "kosher",
  "nut allergy", "peanut allergy", "dairy[- ]?free", "lactose", "shellfish",
  "pescatarian", "no pork", "diabetic", "celiac",
];

function extractDietary(text: string): string | null {
  const found = new Set<string>();
  for (const term of DIETARY) {
    const re = new RegExp(term, "i");
    const m = text.match(re);
    if (m) found.add(m[0].toLowerCase().replace(/\s+/g, " "));
  }
  return found.size ? Array.from(found).join(", ") : null;
}

function extractPlusOnes(text: string): number {
  const m = text.match(/\bplus\s*(\d+)\b|\+\s*(\d+)\b|bringing\s+(\d+)\b/i);
  if (m) return Number(m[1] ?? m[2] ?? m[3] ?? 0);
  if (/\b(my )?(wife|husband|partner|spouse|guest|date)\b/i.test(text)) return 1;
  return 0;
}

/** Deterministic heuristic classifier — the always-available fallback. */
export function classifyHeuristic(text: string): RsvpClassification {
  const t = text.trim();
  const yes = YES.test(t);
  const no = NO.test(t);
  const maybe = MAYBE.test(t);

  let status: RsvpStatus = "PENDING";
  let confidence = 0.4;
  let ambiguous = false;

  const signals = [yes, no, maybe].filter(Boolean).length;
  if (signals > 1 || (yes && no)) {
    status = "AMBIGUOUS";
    ambiguous = true;
    confidence = 0.35;
  } else if (yes) {
    status = "YES";
    confidence = 0.85;
  } else if (no) {
    status = "NO";
    confidence = 0.85;
  } else if (maybe) {
    status = "MAYBE";
    confidence = 0.7;
  } else {
    status = "AMBIGUOUS";
    ambiguous = true;
    confidence = 0.3;
  }

  const dietary = extractDietary(t);
  return {
    status,
    confidence,
    dietary,
    plusOnes: status === "YES" ? extractPlusOnes(t) : 0,
    ambiguous,
    suggestedFollowUp: ambiguous
      ? "Could you confirm whether you'll be attending? A simple yes or no helps us finalize seating."
      : null,
  };
}

/**
 * Classify an RSVP reply. Uses the LLM when available for nuance, otherwise
 * falls back to the heuristic. Always returns a usable classification.
 */
export async function classifyRsvp(
  text: string,
  organizationId: string,
): Promise<RsvpClassification> {
  const fallback = classifyHeuristic(text);

  const raw = await complete(
    `Classify this event RSVP reply. Respond ONLY with JSON:
{"status":"YES|NO|MAYBE|AMBIGUOUS","confidence":0..1,"dietary":string|null,"plusOnes":number,"suggestedFollowUp":string|null}

Reply: """${text.slice(0, 1000)}"""`,
    { organizationId, credits: 1 },
    {
      system:
        "You classify event RSVP replies precisely. dietary should capture any restrictions/allergies mentioned. Be conservative: use AMBIGUOUS when intent is unclear.",
      maxTokens: 300,
    },
  );

  const parsed = extractJson<Partial<RsvpClassification> & { status?: string }>(raw);
  if (!parsed || !parsed.status) return fallback;

  const status = (["YES", "NO", "MAYBE", "AMBIGUOUS"].includes(parsed.status)
    ? parsed.status
    : fallback.status) as RsvpStatus;

  return {
    status,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : fallback.confidence,
    dietary: parsed.dietary ?? fallback.dietary,
    plusOnes: typeof parsed.plusOnes === "number" ? parsed.plusOnes : fallback.plusOnes,
    ambiguous: status === "AMBIGUOUS",
    suggestedFollowUp: parsed.suggestedFollowUp ?? (status === "AMBIGUOUS" ? fallback.suggestedFollowUp : null),
  };
}
