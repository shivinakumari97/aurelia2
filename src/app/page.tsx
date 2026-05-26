import Link from "next/link";
import { Button, Logo, Badge } from "@/components/ui";

const FEATURES = [
  { title: "AI venue matching", body: "Rank your venue inventory against budget, guest count, and location with explainable reasoning." },
  { title: "Predictive budgeting", body: "Cost breakdowns that learn from your past events, with confidence scores and risk flags." },
  { title: "RSVP intelligence", body: "Auto-classify replies as yes / no / maybe, extract dietary needs, and draft follow-ups." },
  { title: "Seating optimization", body: "Generate seating plans honoring groups, hierarchy, and dietary needs — then drag to refine." },
  { title: "Floor-plan parsing", body: "Upload PDFs, extract layout metadata, and keep a full revision history." },
  { title: "Post-event reports", body: "Budget variance, attendance, and vendor performance compound into a proprietary data moat." },
];

const TIERS = [
  { name: "Starter", price: "$0", tag: "Individuals", points: ["1 active event", "100 AI credits / mo", "Core wizard"], cta: "Start free" },
  { name: "Professional", price: "$149", tag: "Teams", points: ["Unlimited events", "5,000 AI credits / mo", "RBAC & audit logs", "Stripe billing"], cta: "Start trial", featured: true },
  { name: "Enterprise", price: "Custom", tag: "Large orgs", points: ["SLA & SSO", "Custom AI limits", "White-label ready", "Data residency"], cta: "Talk to us" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden bg-ink-950 text-parchment">
        <div className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-gold-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-gold-400/10 blur-3xl" />
        <header className="container-page relative flex items-center justify-between py-6">
          <Logo className="[&_span:last-child]:text-parchment" />
          <nav className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-ink-200 hover:text-white">Sign in</Link>
            <Link href="/register"><Button size="sm" variant="secondary">Get started</Button></Link>
          </nav>
        </header>

        <section className="container-page relative grid gap-10 py-20 lg:grid-cols-2 lg:py-28">
          <div className="animate-fade-up">
            <Badge tone="gold">AI-native · Multi-tenant SaaS</Badge>
            <h1 className="mt-5 text-5xl leading-[1.05] text-white sm:text-6xl">
              The operating system for modern events
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-200">
              Aurelia replaces spreadsheets with AI. Predict costs, optimize seating,
              classify RSVPs, and turn every event into compounding intelligence —
              built for agencies and individual planners alike.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/register"><Button size="lg" variant="secondary">Plan your first event</Button></Link>
              <Link href="/login"><Button size="lg" variant="ghost" className="border-ink-600 text-ink-100 hover:bg-ink-800">Resume an event</Button></Link>
            </div>
            <p className="mt-5 text-xs text-ink-400">
              TLS 1.2+ · AES-256 field encryption · GDPR-ready · org-isolated AI
            </p>
          </div>

          <div className="relative animate-fade-up">
            <div className="rounded-2xl border border-ink-700 bg-ink-900/70 p-6 shadow-lift backdrop-blur">
              <div className="mb-4 flex items-center justify-between text-xs text-ink-300">
                <span>Event · Annual Gala 2026</span>
                <Badge tone="gold">Step 2 · Financials</Badge>
              </div>
              <div className="space-y-3">
                {[["Venue & rental", "$42,000", "92%"], ["Catering & beverage", "$38,500", "88%"], ["Entertainment", "$16,000", "74%"], ["Contingency", "$12,000", "—"]].map(([label, amt, conf]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl bg-ink-800/70 px-4 py-3">
                    <span className="text-sm text-ink-100">{label}</span>
                    <span className="flex items-center gap-3 text-sm">
                      <span className="text-white">{amt}</span>
                      <span className="text-gold-300">{conf}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-3 text-sm text-gold-100">
                AI: Entertainment is trending 18% above your past galas — consider an earlier booking.
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Features */}
      <section className="container-page py-20">
        <h2 className="text-3xl sm:text-4xl">One platform, every workflow</h2>
        <p className="mt-3 max-w-2xl text-ink-500">
          A page-by-page wizard takes any event from venue to post-event report —
          with AI assisting (never blocking) at every step.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <h3 className="text-lg">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-ink-50 py-20">
        <div className="container-page">
          <h2 className="text-3xl sm:text-4xl">Pricing that scales with you</h2>
          <p className="mt-3 text-ink-500">From a single planner to enterprise agencies. Per-event pricing available.</p>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {TIERS.map((t) => (
              <div key={t.name} className={`card p-7 ${t.featured ? "ring-2 ring-gold-400" : ""}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl">{t.name}</h3>
                  <Badge tone={t.featured ? "gold" : "neutral"}>{t.tag}</Badge>
                </div>
                <p className="mt-4 text-3xl font-serif text-ink-900">
                  {t.price}<span className="text-base text-ink-400">{t.price.startsWith("$") && t.price !== "$0" ? "/mo" : ""}</span>
                </p>
                <ul className="mt-5 space-y-2 text-sm text-ink-600">
                  {t.points.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <span className="text-gold-500">✦</span> {p}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="mt-7 block">
                  <Button className="w-full" variant={t.featured ? "secondary" : "ghost"}>{t.cta}</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="container-page flex flex-col items-center justify-between gap-4 py-10 text-sm text-ink-400 sm:flex-row">
        <Logo />
        <p>© {new Date().getFullYear()} Aurelia. The AI Event Operating System.</p>
      </footer>
    </div>
  );
}
