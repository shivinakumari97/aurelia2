"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { PermissionMap, Resource } from "@/lib/auth/rbac";
import { VenueStep } from "./steps/venue-step";
import { FinancialsStep } from "./steps/financials-step";
import { RsvpStep } from "./steps/rsvp-step";
import { SeatingStep } from "./steps/seating-step";
import { WorkspaceStep } from "./steps/workspace-step";
import { ItineraryStep } from "./steps/itinerary-step";
import { SimpleStep } from "./steps/simple-step";
import { ClosureStep } from "./steps/closure-step";

export interface WizardEvent {
  id: string;
  name: string;
  type: string;
  status: string;
  currentStep: string;
  expectedGuests: number | null;
  budget: number | null;
  currency: string;
  location: string | null;
  venue: { id: string; name: string } | null;
  counts: { guests: number; tasks: number; financials: number; tables: number };
}

type StepKey =
  | "VENUE" | "FINANCIALS" | "FLOOR_PLANS" | "WORKSPACE"
  | "RSVPS" | "TABLE_PLANNING" | "ITINERARY" | "CLOSURE";

const STEPS: { key: StepKey; label: string; resource: Resource }[] = [
  { key: "VENUE", label: "Venue", resource: "venue" },
  { key: "FINANCIALS", label: "Financials", resource: "financial" },
  { key: "FLOOR_PLANS", label: "Floor plans", resource: "floorplan" },
  { key: "WORKSPACE", label: "Workspace", resource: "task" },
  { key: "RSVPS", label: "RSVPs", resource: "rsvp" },
  { key: "TABLE_PLANNING", label: "Seating", resource: "table" },
  { key: "ITINERARY", label: "Itinerary", resource: "itinerary" },
  { key: "CLOSURE", label: "Closure", resource: "closure" },
];

export interface StepProps {
  event: WizardEvent;
  canEdit: boolean;
  onAdvance: () => void;
}

export function EventWizard({
  event,
  isAdmin,
  permissions,
}: {
  event: WizardEvent;
  isAdmin: boolean;
  permissions: PermissionMap;
}) {
  const router = useRouter();
  const [active, setActive] = useState<StepKey>((event.currentStep as StepKey) ?? "VENUE");
  const [saving, setSaving] = useState(false);

  const canRead = (r: Resource) => isAdmin || (permissions[r]?.includes("read") ?? false);
  const canEdit = (r: Resource) =>
    isAdmin || (permissions[r]?.includes("update") ?? false) || (permissions[r]?.includes("create") ?? false);

  const activeIndex = STEPS.findIndex((s) => s.key === active);
  const activeStep = STEPS[activeIndex]!;

  async function advanceTo(stepKey: StepKey) {
    setSaving(true);
    try {
      await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStep: stepKey }),
      });
      setActive(stepKey);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function goNext() {
    const next = STEPS[activeIndex + 1];
    if (next) advanceTo(next.key);
  }

  const stepView = () => {
    if (!canRead(activeStep.resource)) {
      return (
        <div className="card p-10 text-center">
          <Badge tone="warning">Restricted</Badge>
          <p className="mt-3 text-ink-500">
            Your role doesn’t have access to the {activeStep.label} step. Ask an admin to grant permission.
          </p>
        </div>
      );
    }
    const props: StepProps = { event, canEdit: canEdit(activeStep.resource), onAdvance: goNext };
    switch (active) {
      case "VENUE": return <VenueStep {...props} />;
      case "FINANCIALS": return <FinancialsStep {...props} />;
      case "RSVPS": return <RsvpStep {...props} />;
      case "TABLE_PLANNING": return <SeatingStep {...props} />;
      case "WORKSPACE": return <WorkspaceStep {...props} />;
      case "ITINERARY": return <ItineraryStep {...props} />;
      case "CLOSURE": return <ClosureStep {...props} />;
      case "FLOOR_PLANS":
        return (
          <SimpleStep
            {...props}
            title="Floor plans"
            description="Upload venue floor-plan PDFs. Aurelia extracts layout metadata and keeps a full revision history; the team is notified on changes."
            note="Object storage (S3-equivalent) upload + PDF vision parsing is wired as an interface and ready to connect to your storage bucket."
          />
        );
      default: return null;
    }
  };

  return (
    <div className="container-page py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button onClick={() => router.push("/events")} className="text-sm text-ink-400 hover:text-ink-600">← Events</button>
          <h1 className="mt-1 text-3xl">{event.name}</h1>
          <p className="mt-1 text-sm text-ink-400">
            {event.type} · {event.expectedGuests ?? "—"} guests · {event.location ?? "no location"}
          </p>
        </div>
        <Badge tone="gold">{event.status}</Badge>
      </div>

      {/* Stepper */}
      <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const isActive = s.key === active;
          const locked = !canRead(s.resource);
          return (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                isActive ? "border-ink-900 bg-ink-900 text-parchment"
                  : locked ? "border-ink-100 bg-ink-50 text-ink-300"
                  : "border-ink-200 bg-white text-ink-600 hover:border-gold-300",
              )}
            >
              <span className={cn("grid h-5 w-5 place-items-center rounded-full text-xs",
                isActive ? "bg-gold-500 text-white" : "bg-ink-100 text-ink-500")}>
                {i + 1}
              </span>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="mt-8">{stepView()}</div>

      {/* Footer nav */}
      <div className="mt-8 flex items-center justify-between border-t border-ink-100 pt-6">
        <Button
          variant="ghost"
          disabled={activeIndex === 0 || saving}
          onClick={() => { const p = STEPS[activeIndex - 1]; if (p) setActive(p.key); }}
        >
          ← Back
        </Button>
        {activeIndex < STEPS.length - 1 && (
          <Button variant="secondary" disabled={saving} onClick={goNext}>
            {saving ? "Saving…" : "Save & continue →"}
          </Button>
        )}
      </div>
    </div>
  );
}
