/**
 * Role-Based Access Control.
 *
 * Permissions are stored on Role.permissions as a JSON map:
 *   { "<resource>": ["read", "create", "update", "delete"] }
 *
 * Resources map onto the event workflow steps plus org-management surfaces,
 * giving admins granular, per-step control as required by the spec.
 *
 * Org admins (User.isOrgAdmin) bypass all checks. Associates default to
 * read-only and only gain a capability if their role grants it explicitly.
 */

export const RESOURCES = [
  "event",
  "venue",
  "vendor",
  "financial",
  "floorplan",
  "rsvp",
  "table",
  "task",
  "itinerary",
  "closure",
  "team", // manage users/roles
  "billing",
  "analytics",
] as const;

export type Resource = (typeof RESOURCES)[number];

export const ACTIONS = ["read", "create", "update", "delete"] as const;
export type Action = (typeof ACTIONS)[number];

export type PermissionMap = Partial<Record<Resource, Action[]>>;

export interface Principal {
  userId: string;
  organizationId: string;
  isOrgAdmin: boolean;
  permissions: PermissionMap;
}

export function can(principal: Principal, resource: Resource, action: Action): boolean {
  if (principal.isOrgAdmin) return true;
  const granted = principal.permissions[resource];
  if (!granted) return false;
  return granted.includes(action);
}

/** Throwing variant for use in API handlers. */
export class ForbiddenError extends Error {
  status = 403 as const;
  constructor(resource: Resource, action: Action) {
    super(`Forbidden: missing '${action}' permission on '${resource}'`);
    this.name = "ForbiddenError";
  }
}

export function authorize(principal: Principal, resource: Resource, action: Action): void {
  if (!can(principal, resource, action)) {
    throw new ForbiddenError(resource, action);
  }
}

// ---- Built-in role templates -------------------------------------------------

function fullAccess(): PermissionMap {
  return Object.fromEntries(RESOURCES.map((r) => [r, [...ACTIONS]])) as PermissionMap;
}

function readOnly(): PermissionMap {
  return Object.fromEntries(RESOURCES.map((r) => [r, ["read"]])) as PermissionMap;
}

export const SYSTEM_ROLES: Record<string, { description: string; permissions: PermissionMap }> = {
  "Event Manager": {
    description: "Administrator. Full system access and team/role management.",
    permissions: fullAccess(),
  },
  "Operations": {
    description: "Manages logistics: venues, floor plans, tasks, itinerary, tables.",
    permissions: {
      event: ["read", "update"],
      venue: ["read", "create", "update"],
      vendor: ["read"],
      floorplan: ["read", "create", "update"],
      table: ["read", "create", "update"],
      task: ["read", "create", "update", "delete"],
      itinerary: ["read", "create", "update"],
      rsvp: ["read"],
    },
  },
  "Front Office": {
    description: "Owns guest experience: RSVPs, guest list, seating.",
    permissions: {
      event: ["read"],
      rsvp: ["read", "create", "update"],
      table: ["read", "update"],
      itinerary: ["read"],
    },
  },
  "Finance": {
    description: "Owns budgets and financial records.",
    permissions: {
      event: ["read"],
      financial: ["read", "create", "update", "delete"],
      vendor: ["read", "update"],
      analytics: ["read"],
    },
  },
  "Associate": {
    description: "Default staff role. Read-only across all resources.",
    permissions: readOnly(),
  },
};
