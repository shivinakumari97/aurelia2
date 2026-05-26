"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Field, Input } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    organizationName: "",
    organizationType: "COMPANY",
    industry: "",
    name: "",
    email: "",
    phone: "",
    password: "",
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          industry: form.industry || undefined,
          phone: form.phone || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Registration failed");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl">Create your workspace</h1>
      <p className="mt-2 text-sm text-ink-500">
        You'll be the Event Manager (admin). Add your team and inventory next.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Organization name">
            <Input required value={form.organizationName} onChange={set("organizationName")} placeholder="Acme Events" />
          </Field>
          <Field label="Type">
            <select className="input" value={form.organizationType} onChange={set("organizationType")}>
              <option value="COMPANY">Company (B2B)</option>
              <option value="INDIVIDUAL">Individual (B2C)</option>
            </select>
          </Field>
        </div>
        <Field label="Industry" hint="Optional — helps tailor AI suggestions.">
          <Input value={form.industry} onChange={set("industry")} placeholder="Weddings, Corporate, Hospitality…" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Your name">
            <Input required value={form.name} onChange={set("name")} placeholder="Jordan Lee" />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={set("phone")} placeholder="+1 555 000 1234" />
          </Field>
        </div>
        <Field label="Email">
          <Input type="email" required value={form.email} onChange={set("email")} placeholder="you@company.com" />
        </Field>
        <Field label="Password" hint="At least 10 chars with upper, lower, and a number.">
          <Input type="password" required value={form.password} onChange={set("password")} placeholder="••••••••••" />
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating…" : "Create workspace"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-gold-600 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
