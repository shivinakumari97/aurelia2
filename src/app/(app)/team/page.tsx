import { getAuthContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";
import type { PermissionMap } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const ctx = (await getAuthContext())!;
  const orgId = ctx.organizationId;

  const [roles, users] = await Promise.all([
    prisma.role.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "asc" },
      include: { role: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl">Team & Roles</h1>
      <p className="mt-2 text-ink-500">
        Role-based access control with granular, per-workflow-step permissions. Admins see everything; associates default to read-only.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-xl">Members</h2>
          <Card className="mt-4 p-0">
            <div className="divide-y divide-ink-100">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-medium text-ink-800">{u.name}</p>
                    <p className="text-xs text-ink-400">{u.email}</p>
                  </div>
                  <Badge tone={u.isOrgAdmin ? "gold" : "neutral"}>{u.isOrgAdmin ? "Admin" : u.role?.name ?? "Associate"}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <h2 className="text-xl">Roles</h2>
          <div className="mt-4 space-y-3">
            {roles.map((r) => {
              const perms = r.permissions as PermissionMap;
              const grants = Object.keys(perms).filter((k) => (perms[k as keyof PermissionMap]?.length ?? 0) > 0);
              return (
                <Card key={r.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base">{r.name}</h3>
                    {r.isSystem && <Badge>system</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-ink-500">{r.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {grants.length === 0 && <span className="text-xs text-ink-300">No permissions</span>}
                    {grants.map((g) => <Badge key={g}>{g}</Badge>)}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
