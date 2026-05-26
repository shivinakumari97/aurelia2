"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Button, Badge } from "@/components/ui";
import type { StepProps } from "../event-wizard";

interface TableRow {
  id: string;
  name: string;
  capacity: number;
  guests: { id: string; name: string; plusOnes: number }[];
}
interface Plan {
  score: number;
  unseated: string[];
  notes: string[];
}

export function SeatingStep({ event, canEdit }: StepProps) {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [capacity, setCapacity] = useState("8");
  const [count, setCount] = useState("5");

  const load = useCallback(async () => {
    const res = await fetch(`/api/tables?eventId=${event.id}`);
    if (res.ok) setTables((await res.json()).data.tables);
  }, [event.id]);

  useEffect(() => { load(); }, [load]);

  async function addTables() {
    setBusy(true);
    try {
      await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, count: Number(count), capacity: Number(capacity) }),
      });
      load();
    } finally { setBusy(false); }
  }

  async function optimize() {
    setBusy(true);
    try {
      const res = await fetch("/api/tables/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id }),
      });
      const json = await res.json();
      if (res.ok) { setPlan(json.data.plan); load(); }
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl">Table planning</h2>
            <p className="mt-2 text-sm text-ink-500">
              The optimizer seats confirmed guests by group, hierarchy, and dietary needs — keeping parties together within capacity.
            </p>
          </div>
          <Button variant="secondary" onClick={optimize} disabled={busy || !canEdit || tables.length === 0}>
            {busy ? "Optimizing…" : "✦ Auto-generate plan"}
          </Button>
        </div>

        {canEdit && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="label">Tables</span>
              <input className="input h-9 w-24" value={count} onChange={(e) => setCount(e.target.value)} />
            </label>
            <label className="text-sm">
              <span className="label">Seats each</span>
              <input className="input h-9 w-24" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </label>
            <Button variant="ghost" size="sm" onClick={addTables} disabled={busy}>Add tables</Button>
          </div>
        )}

        {plan && (
          <div className="mt-4 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm text-ink-700">
            Plan quality: <strong>{Math.round(plan.score * 100)}%</strong>
            {plan.unseated.length > 0 && <span className="text-danger"> · {plan.unseated.length} unseated</span>}
            {plan.notes.map((n, i) => <div key={i} className="mt-1 text-xs text-ink-500">• {n}</div>)}
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tables.length === 0 && <p className="text-sm text-ink-400">No tables yet — add some above.</p>}
        {tables.map((t) => {
          const seats = t.guests.reduce((s, g) => s + 1 + g.plusOnes, 0);
          return (
            <Card key={t.id} className="p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base">{t.name}</h4>
                <Badge tone={seats > t.capacity ? "danger" : seats === t.capacity ? "gold" : "neutral"}>
                  {seats}/{t.capacity}
                </Badge>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-ink-600">
                {t.guests.length === 0 && <li className="text-ink-300">Empty</li>}
                {t.guests.map((g) => (
                  <li key={g.id}>• {g.name}{g.plusOnes ? ` (+${g.plusOnes})` : ""}</li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
