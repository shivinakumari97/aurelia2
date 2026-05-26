import Link from "next/link";
import { getAuthContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Button, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "neutral" | "gold" | "success" | "warning"> = {
  DRAFT: "neutral", PLANNING: "gold", CONFIRMED: "gold",
  IN_PROGRESS: "warning", CLOSED: "success", ARCHIVED: "neutral",
};

export default async function EventsPage() {
  const ctx = (await getAuthContext())!;
  const events = await prisma.event.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="container-page py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Events</h1>
        <Link href="/events/new"><Button variant="secondary">+ New event</Button></Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-ink-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-5 py-3 font-medium">Event</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Guests</th>
              <th className="px-5 py-3 font-medium">Budget</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {events.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-ink-400">No events yet.</td></tr>
            )}
            {events.map((e) => (
              <tr key={e.id} className="hover:bg-ink-50">
                <td className="px-5 py-4">
                  <Link href={`/events/${e.id}`} className="font-medium text-ink-900 hover:text-gold-600">{e.name}</Link>
                </td>
                <td className="px-5 py-4 text-ink-500">{e.type}</td>
                <td className="px-5 py-4 text-ink-500">{e.expectedGuests ?? "—"}</td>
                <td className="px-5 py-4 text-ink-500">{e.budget ? formatCurrency(Number(e.budget), e.currency) : "—"}</td>
                <td className="px-5 py-4"><Badge tone={STATUS_TONE[e.status] ?? "neutral"}>{e.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
