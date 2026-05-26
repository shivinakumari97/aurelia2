"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Badge } from "@/components/ui";
import type { StepProps } from "../event-wizard";

interface Report {
  budgetVariance: { planned: number | null; actual: number; variancePct: number | null };
  attendanceRate: number | null;
  summary: string;
  suggestions: string[];
}

export function ClosureStep({ event, canEdit }: StepProps) {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closed = event.status === "CLOSED" || event.status === "ARCHIVED";

  async function endEvent() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${event.id}/close`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Could not close event");
      setReport(json.data.report);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not close event");
    } finally { setBusy(false); }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl">Event closure</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-500">
            End the event to generate an AI post-event report: budget variance, attendance rate,
            and improvement suggestions. Financials are archived (encrypted) and feed future predictions.
            Events auto-close 5 days after the end date.
          </p>
        </div>
        {closed ? <Badge tone="success">Closed</Badge> : (
          <Button variant="danger" onClick={endEvent} disabled={busy || !canEdit}>
            {busy ? "Generating report…" : "End event"}
          </Button>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {report && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-ink-100 p-4">
              <p className="text-xs text-ink-400">Budget variance</p>
              <p className="font-serif text-2xl text-ink-900">
                {report.budgetVariance.variancePct != null ? `${report.budgetVariance.variancePct > 0 ? "+" : ""}${report.budgetVariance.variancePct}%` : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-ink-100 p-4">
              <p className="text-xs text-ink-400">Attendance rate</p>
              <p className="font-serif text-2xl text-ink-900">{report.attendanceRate != null ? `${report.attendanceRate}%` : "—"}</p>
            </div>
            <div className="rounded-xl border border-ink-100 p-4">
              <p className="text-xs text-ink-400">Actual spend</p>
              <p className="font-serif text-2xl text-ink-900">{report.budgetVariance.actual.toLocaleString()}</p>
            </div>
          </div>
          <div className="rounded-xl border border-gold-200 bg-gold-50 p-4">
            <p className="text-sm text-ink-700">{report.summary}</p>
          </div>
          <div>
            <p className="label">Improvement suggestions</p>
            <ul className="space-y-1 text-sm text-ink-600">
              {report.suggestions.map((s, i) => <li key={i}>• {s}</li>)}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
