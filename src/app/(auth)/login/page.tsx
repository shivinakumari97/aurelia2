"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [needsOrg, setNeedsOrg] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(orgSlug ? { organizationSlug: orgSlug } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json?.error?.needsOrg) setNeedsOrg(true);
        throw new Error(json?.error?.message ?? "Sign in failed");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl">Welcome back</h1>
      <p className="mt-2 text-sm text-ink-500">Sign in to your Aurelia workspace.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••" />
        </Field>
        {needsOrg && (
          <Field label="Organization" hint="Your email belongs to multiple organizations.">
            <Input value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} placeholder="organization-slug" />
          </Field>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-500">
        New to Aurelia?{" "}
        <Link href="/register" className="font-medium text-gold-600 hover:underline">Create an organization</Link>
      </p>
    </div>
  );
}
