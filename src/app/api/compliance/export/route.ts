import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleError, getIp } from "@/lib/api";
import { authorize } from "@/lib/auth/rbac";
import { decryptField } from "@/lib/crypto/field-encryption";
import { audit } from "@/lib/audit";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GDPR data export: returns the organization's data as a downloadable JSON
 * bundle, with encrypted PII fields decrypted for the data subject. Admin-only.
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    authorize(ctx, "team", "read"); // org-data export is an admin/management action

    const orgId = ctx.organizationId;
    const [org, users, events, guests, vendors] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.user.findMany({ where: { organizationId: orgId }, select: { id: true, name: true, email: true, phoneEnc: true, createdAt: true } }),
      prisma.event.findMany({ where: { organizationId: orgId } }),
      prisma.guest.findMany({ where: { organizationId: orgId } }),
      prisma.vendor.findMany({ where: { organizationId: orgId } }),
    ]);

    const bundle = {
      exportedAt: new Date().toISOString(),
      organization: org,
      users: users.map((u) => ({ ...u, phone: decryptField(u.phoneEnc), phoneEnc: undefined })),
      events,
      guests: guests.map((g) => ({
        ...g,
        email: decryptField(g.emailEnc),
        phone: decryptField(g.phoneEnc),
        dietary: decryptField(g.dietaryEnc),
        emailEnc: undefined,
        phoneEnc: undefined,
        dietaryEnc: undefined,
      })),
      vendors: vendors.map((v) => ({
        ...v,
        contact: decryptField(v.contactEnc),
        contract: decryptField(v.contractEnc),
        contactEnc: undefined,
        contractEnc: undefined,
      })),
    };

    await audit({ organizationId: orgId, userId: ctx.userId, action: "EXPORT", resource: "organization", resourceId: orgId, ip: getIp(req) });

    return new NextResponse(JSON.stringify(bundle, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="aurelia-export-${orgId}.json"`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
