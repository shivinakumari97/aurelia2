"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Button, Badge } from "@/components/ui";
import type { StepProps } from "../event-wizard";

interface Guest {
  id: string;
  name: string;
  rsvpStatus: string;
  plusOnes: number;
  groupTag: string | null;
  dietary: string | null;
  lastReplyText: string | null;
}

const TONE: Record<string, "neutral" | "success" | "danger" | "warning" | "gold"> = {
  PENDING: "neutral", YES: "success", NO: "danger", MAYBE: "warning", AMBIGUOUS: "gold",
};

// Minimal CSV parser: header row with name,email,phone,groupTag,seatRank.
function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return {
      name: row.name || "Guest",
      email: row.email || undefined,
      phone: row.phone || undefined,
      groupTag: row.grouptag || row.group || undefined,
      seatRank: row.seatrank ? Number(row.seatrank) : undefined,
    };
  });
}

export function RsvpStep({ event, canEdit }: StepProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/guests?eventId=${event.id}`);
    if (res.ok) setGuests((await res.json()).data.guests);
  }, [event.id]);

  useEffect(() => { load(); }, [load]);

  async function importCsv() {
    const parsed = parseCsv(csv);
    if (parsed.length === 0) { setMsg("No valid rows. Use header: name,email,phone,groupTag"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/guests/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, guests: parsed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Import failed");
      setMsg(`Imported ${json.data.imported} guests.`);
      setCsv("");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function classify(guestId: string) {
    const text = reply[guestId];
    if (!text) return;
    setBusy(true);
    try {
      await fetch("/api/rsvp/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId, replyText: text }),
      });
      setReply((r) => ({ ...r, [guestId]: "" }));
      load();
    } finally {
      setBusy(false);
    }
  }

  const counts = guests.reduce((acc, g) => { acc[g.rsvpStatus] = (acc[g.rsvpStatus] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-2xl">RSVPs</h2>
        <p className="mt-2 text-sm text-ink-500">
          Import your guest list, then let AI classify replies (Yes / No / Maybe), extract dietary needs, and flag ambiguous responses.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["YES", "NO", "MAYBE", "AMBIGUOUS", "PENDING"].map((s) => (
            <Badge key={s} tone={TONE[s]}>{s}: {counts[s] ?? 0}</Badge>
          ))}
        </div>

        {canEdit && (
          <div className="mt-5">
            <p className="label">Import guests (CSV)</p>
            <textarea
              className="input min-h-[110px] font-mono text-xs"
              placeholder={"name,email,phone,groupTag\nJordan Lee,jordan@x.com,+15550001,bride-side\nSam Park,sam@x.com,,engineering"}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
            <div className="mt-3 flex items-center gap-3">
              <Button variant="secondary" onClick={importCsv} disabled={busy}>Import guests</Button>
              {msg && <span className="text-sm text-ink-500">{msg}</span>}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-xl">Guest list ({guests.length})</h3>
        <div className="mt-4 space-y-2">
          {guests.length === 0 && <p className="text-sm text-ink-400">No guests yet — import a list above.</p>}
          {guests.map((g) => (
            <div key={g.id} className="rounded-xl border border-ink-100 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-ink-900">{g.name}</span>
                  {g.groupTag && <span className="ml-2 text-xs text-ink-400">· {g.groupTag}</span>}
                  {g.dietary && <span className="ml-2 text-xs text-gold-600">· {g.dietary}</span>}
                </div>
                <Badge tone={TONE[g.rsvpStatus] ?? "neutral"}>
                  {g.rsvpStatus}{g.plusOnes ? ` +${g.plusOnes}` : ""}
                </Badge>
              </div>
              {canEdit && (
                <div className="mt-2 flex gap-2">
                  <input
                    className="input h-9 text-sm"
                    placeholder="Paste their reply to classify…"
                    value={reply[g.id] ?? ""}
                    onChange={(e) => setReply((r) => ({ ...r, [g.id]: e.target.value }))}
                  />
                  <Button size="sm" variant="ghost" onClick={() => classify(g.id)} disabled={busy || !reply[g.id]}>
                    ✦ Classify
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
