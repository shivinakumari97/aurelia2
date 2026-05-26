import { getAuthContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, Badge, Button } from "@/components/ui";

export const dynamic = "force-dynamic";

const TIERS = [
  { name: "STARTER", price: "$0", credits: 100, points: ["1 active event", "Core wizard", "Community support"] },
  { name: "PROFESSIONAL", price: "$149/mo", credits: 5000, points: ["Unlimited events", "RBAC & audit logs", "Priority support"] },
  { name: "ENTERPRISE", price: "Custom", credits: 50000, points: ["SSO & SLA", "White-label", "Data residency"] },
];

export default async function BillingPage() {
  const ctx = (await getAuthContext())!;
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { tier: true, aiCreditsUsed: true, aiCreditsLimit: true, analyticsOptIn: true, type: true },
  });

  const used = org?.aiCreditsUsed ?? 0;
  const limit = org?.aiCreditsLimit ?? 100;
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl">Billing & usage</h1>
      <p className="mt-2 text-ink-500">Organization-level billing with Stripe. AI usage is metered per tier.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <p className="text-sm text-ink-400">Current plan</p>
          <p className="mt-1 font-serif text-3xl text-ink-900">{org?.tier}</p>
          <Badge tone="gold">{org?.type === "INDIVIDUAL" ? "Individual (B2C)" : "Company (B2B)"}</Badge>
          <div className="mt-5">
            <div className="flex justify-between text-xs text-ink-400">
              <span>AI credits this cycle</span><span>{used}/{limit}</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-100">
              <div className="h-full rounded-full bg-gold-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <p className="mt-4 text-xs text-ink-400">
            Stripe integration is wired as an interface (STRIPE_SECRET_KEY). Per-event pricing and usage analytics are supported by the data model.
          </p>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2 lg:grid-cols-3">
          {TIERS.map((t) => (
            <Card key={t.name} className={`p-5 ${t.name === org?.tier ? "ring-2 ring-gold-400" : ""}`}>
              <h3 className="text-lg">{t.name[0] + t.name.slice(1).toLowerCase()}</h3>
              <p className="mt-1 font-serif text-2xl text-ink-900">{t.price}</p>
              <p className="text-xs text-ink-400">{t.credits.toLocaleString()} AI credits / mo</p>
              <ul className="mt-3 space-y-1 text-xs text-ink-600">
                {t.points.map((p) => <li key={p}>✦ {p}</li>)}
              </ul>
              <Button size="sm" variant={t.name === org?.tier ? "ghost" : "secondary"} className="mt-4 w-full" disabled={t.name === org?.tier}>
                {t.name === org?.tier ? "Current" : "Upgrade"}
              </Button>
            </Card>
          ))}
        </div>
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base">Anonymized benchmarking (data moat)</h3>
            <p className="mt-1 text-sm text-ink-500">
              Opt in to contribute anonymized cost & attendance metrics in exchange for industry benchmarks. Off by default.
            </p>
          </div>
          <Badge tone={org?.analyticsOptIn ? "success" : "neutral"}>{org?.analyticsOptIn ? "Opted in" : "Opted out"}</Badge>
        </div>
      </Card>
    </div>
  );
}
