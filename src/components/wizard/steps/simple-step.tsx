import { Card, Badge } from "@/components/ui";
import type { StepProps } from "../event-wizard";

export function SimpleStep({
  title,
  description,
  note,
}: StepProps & { title: string; description: string; note?: string }) {
  return (
    <Card>
      <h2 className="text-2xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-ink-500">{description}</p>
      {note && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3">
          <Badge tone="gold">Roadmap</Badge>
          <p className="text-sm text-ink-600">{note}</p>
        </div>
      )}
    </Card>
  );
}
