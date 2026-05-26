"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Button, Field, Input, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

interface Venue {
  id: string;
  name: string;
  city: string | null;
  capacity: number | null;
  basePrice: string | null;
  currency: string;
  amenities: string[];
}

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [form, setForm] = useState({ name: "", city: "", capacity: "", basePrice: "", amenities: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/venues");
    if (res.ok) setVenues((await res.json()).data.venues);
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          city: form.city || undefined,
          capacity: form.capacity ? Number(form.capacity) : undefined,
          basePrice: form.basePrice ? Number(form.basePrice) : undefined,
          amenities: form.amenities ? form.amenities.split(",").map((a) => a.trim()).filter(Boolean) : [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Could not add venue");
      setForm({ name: "", city: "", capacity: "", basePrice: "", amenities: "" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add venue");
    } finally { setBusy(false); }
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl">Venues</h1>
      <p className="mt-2 text-ink-500">Your venue inventory powers AI venue matching during the wizard.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <h2 className="text-xl">Add a venue</h2>
          <form onSubmit={add} className="mt-4 space-y-3">
            <Field label="Name"><Input required value={form.name} onChange={set("name")} placeholder="The Grand Ballroom" /></Field>
            <Field label="City"><Input value={form.city} onChange={set("city")} placeholder="San Francisco" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Capacity"><Input type="number" value={form.capacity} onChange={set("capacity")} placeholder="200" /></Field>
              <Field label="Base price"><Input type="number" value={form.basePrice} onChange={set("basePrice")} placeholder="40000" /></Field>
            </div>
            <Field label="Amenities" hint="Comma-separated"><Input value={form.amenities} onChange={set("amenities")} placeholder="Catering kitchen, Parking, AV, Outdoor" /></Field>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" variant="secondary" className="w-full" disabled={busy}>Add venue</Button>
          </form>
        </Card>

        <div className="space-y-3">
          {venues.length === 0 && <Card><p className="text-ink-400">No venues yet.</p></Card>}
          {venues.map((v) => (
            <Card key={v.id} className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg">{v.name}</h3>
                {v.basePrice && <span className="text-sm font-medium text-gold-600">{formatCurrency(Number(v.basePrice), v.currency)}</span>}
              </div>
              <p className="mt-1 text-sm text-ink-400">{v.city ?? "—"} · {v.capacity ?? "—"} capacity</p>
              {v.amenities.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {v.amenities.map((a) => <Badge key={a}>{a}</Badge>)}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
