import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { EventWizard, type WizardEvent } from "@/components/wizard/event-wizard";

export const dynamic = "force-dynamic";

export default async function EventWizardPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      venue: { select: { id: true, name: true } },
      _count: { select: { guests: true, tasks: true, financialRecords: true, tables: true } },
    },
  });
  if (!event) notFound();

  const wizardEvent: WizardEvent = {
    id: event.id,
    name: event.name,
    type: event.type,
    status: event.status,
    currentStep: event.currentStep,
    expectedGuests: event.expectedGuests,
    budget: event.budget ? Number(event.budget) : null,
    currency: event.currency,
    location: event.location,
    venue: event.venue,
    counts: {
      guests: event._count.guests,
      tasks: event._count.tasks,
      financials: event._count.financialRecords,
      tables: event._count.tables,
    },
  };

  return (
    <EventWizard
      event={wizardEvent}
      isAdmin={ctx.isOrgAdmin}
      permissions={ctx.permissions}
    />
  );
}
