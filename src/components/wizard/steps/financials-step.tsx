"use client";

import { useState } from "react";
import { Card, Button, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import type { StepProps } from "../event-wizard";

interface CostLine {
  category: string;
  label: string;
  amount: number;
  confidence: number;
  isRisk: boolean;
  note?: string;
}
interface Prediction {
  currency: string;
  lines: CostLine[];
  total: number;
  budget?: number;
  overBudget: boolean;
  aiUsed: boolean;
}

export function FinancialsStep({ event, canEdit }: StepProps) {
  const [loading, setLoading] = useState(false);
  const [pred, setPred] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/financials/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          eventType: event.type,
          budget: event.budget ?? 100000,
          guestCount: event.expectedGuests ?? undefined,
          currency: event.currency,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Prediction failed");
      setPred(json.data.prediction);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl">Financial planning</h2>
          <p className="mt-2 text-sm text-ink-500">
            AI generates a cost breakdown by category, blends your past-event averages, scores confidence, and flags risk.
          </p>
        </div>
        <Button variant="secondary" onClick={generate} disabled={loading || !canEdit}>
          {loading ? "Predicting…" : "✦ Generate breakdown"}
        </Button>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {pred && (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs text-ink-400">Predicted total</p>
              <p className="font-serif text-2xl text-ink-900">{formatCurrency(pred.total, pred.currency)}</p>
            </div>
            {pred.budget != null && (
              <div>
                <p className="text-xs text-ink-400">Budget</p>
                <p className="font-serif text-2xl text-ink-900">{formatCurrency(pred.budget, pred.currency)}</p>
              </div>
            )}
            <Badge tone={pred.overBudget ? "danger" : "success"}>{pred.overBudget ? "Over budget" : "Within budget"}</Badge>
            <Badge tone={pred.aiUsed ? "gold" : "neutral"}>{pred.aiUsed ? "AI refined" : "Modeled"}</Badge>
          </div>

          <div className="overflow-hidden rounded-xl border border-ink-100">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                  <th className="px-4 py-2.5 font-medium text-right">Confidence</th>
                  <th className="px-4 py-2.5 font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {pred.lines.map((l) => (
                  <tr key={l.category} className={l.isRisk ? "bg-red-50/50" : ""}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-ink-800">{l.label}</span>
                      {l.isRisk && <Badge tone="danger">risk</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right text-ink-800">{formatCurrency(l.amount, pred.currency)}</td>
                    <td className="px-4 py-3 text-right text-ink-500">{Math.round(l.confidence * 100)}%</td>
                    <td className="px-4 py-3 text-xs text-ink-400">{l.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-ink-400">
            Predicted line items are saved (amounts encrypted at rest) and feed future predictions.
          </p>
        </div>
      )}

      {!pred && !loading && (
        <p className="mt-6 text-sm text-ink-400">No breakdown yet. Generate one to see categories, confidence, and risk flags.</p>
      )}
    </Card>
  );
}
