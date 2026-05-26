"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Button, Badge } from "@/components/ui";
import type { StepProps } from "../event-wizard";

interface Item { time: string; title: string; owner?: string }

export function ItineraryStep({ event, canEdit }: StepProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [revision, setRevision] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/itinerary?eventId=${event.id}`);
    if (res.ok) {
      const it = (await res.json()).data.itinerary;
      if (it) { setItems(it.items ?? []); setRevision(it.revision); }
    }
  }, [event.id]);

  useEffect(() => { load(); }, [load]);

  function addRow() { setItems((i) => [...i, { time: "09:00", title: "", owner: "" }]); }
  function update(idx: number, key: keyof Item, val: string) {
    setItems((i) => i.map((it, k) => (k === idx ? { ...it, [key]: val } : it)));
  }
  function remove(idx: number) { setItems((i) => i.filter((_, k) => k !== idx)); }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/itinerary", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, items: items.filter((i) => i.title) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Save failed");
      setRevision(json.data.itinerary.revision);
      setMsg(`Saved as revision ${json.data.itinerary.revision}.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally { setBusy(false); }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl">Event itinerary</h2>
          <p className="mt-2 text-sm text-ink-500">Day-of schedule with version control. The team is notified on changes.</p>
        </div>
        {revision != null && <Badge tone="gold">Revision {revision}</Badge>}
      </div>

      <div className="mt-5 space-y-2">
        {items.map((it, idx) => (
          <div key={idx} className="flex flex-wrap items-center gap-2">
            <input className="input h-9 w-24" value={it.time} onChange={(e) => update(idx, "time", e.target.value)} disabled={!canEdit} />
            <input className="input h-9 flex-1" placeholder="Agenda item" value={it.title} onChange={(e) => update(idx, "title", e.target.value)} disabled={!canEdit} />
            <input className="input h-9 w-40" placeholder="Owner" value={it.owner ?? ""} onChange={(e) => update(idx, "owner", e.target.value)} disabled={!canEdit} />
            {canEdit && <button onClick={() => remove(idx)} className="text-ink-300 hover:text-danger">✕</button>}
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-ink-400">No schedule items yet.</p>}
      </div>

      {canEdit && (
        <div className="mt-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={addRow}>+ Add item</Button>
          <Button variant="secondary" size="sm" onClick={save} disabled={busy}>Save revision</Button>
          {msg && <span className="text-sm text-ink-500">{msg}</span>}
        </div>
      )}
    </Card>
  );
}
