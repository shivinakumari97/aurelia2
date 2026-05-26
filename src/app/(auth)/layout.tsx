import Link from "next/link";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-950 p-12 text-parchment lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-24 -right-12 h-80 w-80 rounded-full bg-gold-500/20 blur-3xl" />
        <Link href="/"><Logo className="[&_span:last-child]:text-parchment" /></Link>
        <div className="relative max-w-md">
          <h2 className="text-4xl leading-tight text-white">
            Every event, smarter than the last.
          </h2>
          <p className="mt-4 text-ink-300">
            Aurelia turns your venues, vendors, and past events into a private AI
            advantage — predicting costs, optimizing seating, and closing the loop
            with post-event intelligence.
          </p>
        </div>
        <p className="relative text-xs text-ink-500">
          Enterprise-grade security · AES-256 · GDPR-ready · org-isolated data
        </p>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
