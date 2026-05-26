"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Card } from "@/components/ui";

export default function NewEventPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    type: "WEDDING",
    expectedGuests: "",
    budget: "",
    currency: "USD",
    location: "",
    startDate: "",
    endDate: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          currency: form.currency,
          location: form.location || undefined,
          expectedGuests: form.expectedGuests ? Number(form.expectedGuests) : undefined,
          budget: form.budget ? Number(form.budget) : undefined,
          startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
          endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Could not create event");
      router.push(`/events/${json.data.event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create event");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="text-3xl">Plan a new event</h1>
      <p className="mt-2 text-ink-500">Start the 8-step wizard. You can change any of this later.</p>

      <Card className="mt-8">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Event name">
            <Input required value={form.name} onChange={set("name")} placeholder="Annual Gala 2026" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select className="input" value={form.type} onChange={set("type")}>
                {["WEDDING", "CORPORATE", "GALA", "CONFERENCE", "SOCIAL", "OTHER"].map((t) => (
                  <option key={t} value={t}>{t[0] + t.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </Field>
            <Field label="Expected guests">
              <Input type="number" min={1} value={form.expectedGuests} onChange={set("expectedGuests")} placeholder="150" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Budget">
              <Input type="number" min={0} value={form.budget} onChange={set("budget")} placeholder="120000" />
            </Field>
            <Field label="Currency">
              <select className="input" value={form.currency} onChange={set("currency")}>
                {["USD", "EUR", "GBP", "INR", "AUD", "CAD"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Location">
            <Input value={form.location} onChange={set("location")} placeholder="San Francisco, CA" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <Input type="date" value={form.startDate} onChange={set("startDate")} />
            </Field>
            <Field label="End date">
              <Input type="date" value={form.endDate} onChange={set("endDate")} />
            </Field>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Create & start wizard"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
