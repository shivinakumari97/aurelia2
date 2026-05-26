import Link from "next/link";
import { getAuthContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Button, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STEP_LABELS: Record<string, string> = {
  VENUE: "Venue", FINANCIALS: "Financials", FLOOR_PLANS: "Floor plans",
  WORKSPACE: "Workspace", RSVPS: "RSVPs", TABLE_PLANNING: "Seating",
  ITINERARY: "Itinerary", CLOSURE: "Closure",
};

export default async function DashboardPage() {
  const ctx = (await getAuthContext())!;
  const orgId = ctx.organizationId;

  const [active, recent, counts] = await Promise.all([
    prisma.event.findMany({
      where: { organizationId: orgId, status: { in: ["PLANNING", "CONFIRMED", "IN_PROGRESS", "DRAFT"] } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.event.count({ where: { organizationId: orgId } }),
    prisma.$transaction([
      prisma.venue.count({ where: { organizationId: orgId } }),
      prisma.vendor.count({ where: { organizationId: orgId } }),
      prisma.guest.count({ where: { organizationId: orgId } }),
    ]),
  ]);
  const [venueCount, vendorCount, guestCount] = counts;

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-ink-400">Welcome back, {ctx.name.split(" ")[0]}</p>
          <h1 className="mt-1 text-3xl">Dashboard</h1>
        </div>
        <Link href="/events/new"><Button variant="secondary">+ Plan new event</Button></Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Events", recent], ["Venues", venueCount], ["Vendors", vendorCount], ["Guests", guestCount],
        ].map(([label, value]) => (
          <div key={label as string} className="card p-5">
            <p className="text-sm text-ink-400">{label}</p>
            <p className="mt-1 font-serif text-3xl text-ink-900">{value as number}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Resume an event</h2>
            <Link href="/events" className="text-sm text-gold-600 hover:underline">View all</Link>
          </div>
          <div className="mt-4 space-y-3">
            {active.length === 0 && (
              <div className="card p-8 text-center">
                <p className="text-ink-500">No events yet.</p>
                <Link href="/events/new" className="mt-4 inline-block">
                  <Button variant="secondary">Plan your first event</Button>
                </Link>
              </div>
            )}
            {active.map((e) => (
              <Link key={e.id} href={`/events/${e.id}`} className="card flex items-center justify-between p-5 transition hover:shadow-lift">
                <div>
                  <p className="font-medium text-ink-900">{e.name}</p>
                  <p className="mt-0.5 text-sm text-ink-400">
                    {e.type} · {e.expectedGuests ?? "—"} guests · {e.budget ? formatCurrency(Number(e.budget), e.currency) : "no budget"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone="gold">Step · {STEP_LABELS[e.currentStep]}</Badge>
                  <span className="text-ink-300">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl">Get set up</h2>
          <div className="mt-4 card divide-y divide-ink-100 p-0">
            {([
              { label: "Add venues", href: "/venues", meta: `${venueCount} added` },
              { label: "Plan a new event", href: "/events/new", meta: "8-step wizard" },
              { label: "Invite your team", href: "/team", meta: ctx.isOrgAdmin ? "Admin" : "—" },
            ] as const).map((item) => (
              <Link key={item.label} href={item.href} className="flex items-center justify-between px-5 py-4 hover:bg-ink-50">
                <span className="text-sm font-medium text-ink-800">{item.label}</span>
                <span className="text-xs text-ink-400">{item.meta}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
