import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/app-sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { name: true, tier: true, type: true, aiCreditsUsed: true, aiCreditsLimit: true },
  });

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <AppSidebar
        user={{ name: ctx.name, email: ctx.email, isOrgAdmin: ctx.isOrgAdmin }}
        org={{
          name: org?.name ?? "Workspace",
          tier: org?.tier ?? "STARTER",
          aiCreditsUsed: org?.aiCreditsUsed ?? 0,
          aiCreditsLimit: org?.aiCreditsLimit ?? 100,
        }}
        permissions={ctx.permissions}
      />
      <main className="min-h-screen bg-parchment">{children}</main>
    </div>
  );
}
