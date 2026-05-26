import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@prisma/client";

/**
 * Append-only audit logging. Financial and permission changes MUST be logged
 * (compliance requirement). Failures here never block the primary operation.
 */
export async function audit(entry: {
  organizationId: string;
  userId?: string | null;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: entry.organizationId,
        userId: entry.userId ?? null,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId ?? null,
        metadata: (entry.metadata ?? {}) as object,
        ip: entry.ip ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write audit log", err);
  }
}
