"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Field, Input, Badge } from "@/components/ui";
import type { StepProps } from "../event-wizard";

interface RankedVenue {
  venueId: string;
  name: string;
  score: number;
  budgetFit: string;
  reasons: string[];
}

export function VenueStep({ event, canEdit }: StepProps) {
  const router = useRouter();
  const [budget, setBudget] = useState(event.budget?.toString() ?? "");
  const [guests, setGuests] = useState(event.expectedGuests?.toString() ?? "");
  const [city, setCity] = useState(event.location ?? "");
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [ranked, setRanked] = useState<RankedVenue[] | null>(null);
  const [reasoning, setReasoning] = useState<string>("");
  const [aiUsed, setAiUsed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function suggest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/venues/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget: budget ? Number(budget) : undefined,
          guestCount: guests ? Number(guests) : undefined,
          city: city || undefined,
          eventType: event.type,
          customPrompt: customPrompt || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Suggestion failed");
      setRanked(json.data.ranked);
      setReasoning(json.data.reasoning);
      setAiUsed(json.data.aiUsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suggestion failed");
    } finally {
      setLoading(false);
    }
  }

  async function selectVenue(venueId: string) {
    await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueId }),
    });
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <Card>
        <h2 className="text-2xl">Venue selection</h2>
        <p className="mt-2 text-sm text-ink-500">
          Pick a venue from your inventory, or let Aurelia rank them against this brief.
        </p>

        {event.venue && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <span className="text-sm text-emerald-800">Selected: <strong>{event.venue.name}</strong></span>
            <Badge tone="success">Finalized</Badge>
          </div>
        )}

        <div className="mt-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Budget"><Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="120000" /></Field>
            <Field label="Guests"><Input value={guests} onChange={(e) => setGuests(e.target.value)} placeholder="150" /></Field>
          </div>
          <Field label="City"><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="San Francisco" /></Field>
          <Field label="Custom AI prompt" hint="Editable — steer the recommendation before running.">
            <textarea className="input min-h-[72px]" value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Prioritize outdoor ceremony space and on-site catering." />
          </Field>
          <Button variant="secondary" className="w-full" onClick={suggest} disabled={loading || !canEdit}>
            {loading ? "Analyzing…" : "✦ AI suggest venues"}
          </Button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-xl">Ranked venues</h3>
          {ranked && <Badge tone={aiUsed ? "gold" : "neutral"}>{aiUsed ? "AI reasoning" : "Heuristic"}</Badge>}
        </div>

        {reasoning && (
          <div className="mt-4 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm text-ink-700">
            {reasoning}
          </div>
        )}

        {!ranked && (
          <p className="mt-6 text-sm text-ink-400">Run a suggestion to see ranked venues with reasoning and budget fit.</p>
        )}

        <div className="mt-4 space-y-3">
          {ranked?.length === 0 && (
            <p className="text-sm text-ink-400">No venues in inventory yet. Add venues under “Venues”.</p>
          )}
          {ranked?.map((v) => (
            <div key={v.venueId} className="rounded-xl border border-ink-100 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-ink-900">{v.name}</p>
                <div className="flex items-center gap-2">
                  <Badge tone={v.budgetFit === "fits" ? "success" : v.budgetFit === "over" ? "danger" : "neutral"}>{v.budgetFit}</Badge>
                  <span className="text-sm font-semibold text-gold-600">{Math.round(v.score * 100)}%</span>
                </div>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-ink-500">
                {v.reasons.slice(0, 3).map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
              {canEdit && (
                <Button size="sm" variant="ghost" className="mt-3" onClick={() => selectVenue(v.venueId)}>
                  Select this venue
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
