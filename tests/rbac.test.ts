import { describe, it, expect } from "vitest";
import { can, authorize, ForbiddenError, SYSTEM_ROLES, type Principal } from "@/lib/auth/rbac";

const admin: Principal = { userId: "a", organizationId: "o", isOrgAdmin: true, permissions: {} };
const associate: Principal = {
  userId: "b",
  organizationId: "o",
  isOrgAdmin: false,
  permissions: { event: ["read"], financial: ["read", "update"] },
};

describe("RBAC", () => {
  it("admin can do everything regardless of permission map", () => {
    expect(can(admin, "billing", "delete")).toBe(true);
    expect(can(admin, "team", "update")).toBe(true);
  });

  it("associate is limited to explicitly granted actions", () => {
    expect(can(associate, "event", "read")).toBe(true);
    expect(can(associate, "event", "update")).toBe(false);
    expect(can(associate, "financial", "update")).toBe(true);
    expect(can(associate, "venue", "read")).toBe(false);
  });

  it("authorize throws ForbiddenError when not permitted", () => {
    expect(() => authorize(associate, "venue", "create")).toThrow(ForbiddenError);
    expect(() => authorize(associate, "event", "read")).not.toThrow();
  });

  it("system Associate role is read-only across resources", () => {
    const perms = SYSTEM_ROLES.Associate!.permissions;
    for (const actions of Object.values(perms)) {
      expect(actions).toEqual(["read"]);
    }
  });

  it("Event Manager system role has full access", () => {
    const perms = SYSTEM_ROLES["Event Manager"]!.permissions;
    expect(perms.financial).toContain("delete");
    expect(perms.team).toContain("update");
  });
});
