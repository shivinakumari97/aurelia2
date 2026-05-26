"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { PermissionMap, Resource } from "@/lib/auth/rbac";

interface NavItem {
  href: string;
  label: string;
  resource?: Resource; // hidden unless the user can read it (admins see all)
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/events", label: "Events", resource: "event" },
  { href: "/venues", label: "Venues", resource: "venue" },
  { href: "/team", label: "Team & Roles", resource: "team" },
  { href: "/billing", label: "Billing", resource: "billing" },
];

export function AppSidebar({
  user,
  org,
  permissions,
}: {
  user: { name: string; email: string; isOrgAdmin: boolean };
  org: { name: string; tier: string; aiCreditsUsed: number; aiCreditsLimit: number };
  permissions: PermissionMap;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const canSee = (item: NavItem) =>
    !item.resource || user.isOrgAdmin || (permissions[item.resource]?.includes("read") ?? false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const pct = Math.min(100, Math.round((org.aiCreditsUsed / Math.max(1, org.aiCreditsLimit)) * 100));

  return (
    <aside className="flex flex-col gap-6 border-r border-ink-100 bg-white p-5 lg:h-screen lg:sticky lg:top-0">
      <Link href="/dashboard"><Logo /></Link>

      <div className="rounded-xl border border-ink-100 bg-ink-50 p-3">
        <p className="truncate text-sm font-medium text-ink-800">{org.name}</p>
        <div className="mt-1 flex items-center gap-2">
          <Badge tone="gold">{org.tier}</Badge>
          <span className="text-xs text-ink-400">{user.isOrgAdmin ? "Admin" : "Associate"}</span>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-[11px] text-ink-400">
            <span>AI credits</span>
            <span>{org.aiCreditsUsed}/{org.aiCreditsLimit}</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-gold-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.filter(canSee).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-xl px-3.5 py-2.5 text-sm font-medium transition",
                active ? "bg-ink-900 text-parchment" : "text-ink-600 hover:bg-ink-50",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink-100 pt-4">
        <p className="truncate text-sm font-medium text-ink-800">{user.name}</p>
        <p className="truncate text-xs text-ink-400">{user.email}</p>
        <button onClick={logout} className="mt-3 text-sm font-medium text-ink-500 hover:text-danger">
          Sign out
        </button>
      </div>
    </aside>
  );
}
