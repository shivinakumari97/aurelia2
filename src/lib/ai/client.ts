import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

/**
 * AI provider abstraction.
 *
 * - All AI work is organization-scoped. We never mix tenants in a single
 *   request and never persist prompts for training without explicit consent.
 * - When ANTHROPIC_API_KEY is absent, `complete()` returns null and callers
 *   fall back to deterministic heuristics, so the product is fully functional
 *   (degraded, not broken) without AI credentials.
 */

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!env.aiEnabled) return null;
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

export interface AiUsageContext {
  organizationId: string;
  /** rough credit cost of this call */
  credits?: number;
}

/** Returns true if the org has AI credits remaining for this billing cycle. */
export async function hasCredits(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { aiCreditsUsed: true, aiCreditsLimit: true },
  });
  if (!org) return false;
  return org.aiCreditsUsed < org.aiCreditsLimit;
}

async function chargeCredits(organizationId: string, credits: number): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: { aiCreditsUsed: { increment: credits } },
  });
}

/**
 * Run a single-turn completion. Returns the model text, or null when AI is
 * disabled or the org is out of credits (caller should fall back).
 */
export async function complete(
  prompt: string,
  ctx: AiUsageContext,
  opts?: { system?: string; maxTokens?: number },
): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  if (!(await hasCredits(ctx.organizationId))) return null;

  try {
    const res = await c.messages.create({
      model: env.AI_MODEL,
      max_tokens: opts?.maxTokens ?? 1024,
      system: opts?.system,
      messages: [{ role: "user", content: prompt }],
    });
    await chargeCredits(ctx.organizationId, ctx.credits ?? 1);
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return text;
  } catch (err) {
    console.error("[ai] completion failed, falling back", err);
    return null;
  }
}

/** Parse a JSON object out of a model response that may include prose/fences. */
export function extractJson<T>(text: string | null): T | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const arrStart = candidate.indexOf("[");
  const begin =
    start === -1 ? arrStart : arrStart === -1 ? start : Math.min(start, arrStart);
  if (begin === -1) return null;
  const end = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));
  if (end === -1) return null;
  try {
    return JSON.parse(candidate.slice(begin, end + 1)) as T;
  } catch {
    return null;
  }
}
