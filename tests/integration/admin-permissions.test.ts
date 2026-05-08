/**
 * Wave 1A.5 — AUTH-011 admin-permissions test.
 *
 * Verifies the post-mig-094 contract:
 *   1. profiles.role MUST be 'admin' (no fallback to legacy super_admin /
 *      moderator / support values).
 *   2. admin_roles.role drives the capability matrix.
 *   3. admin_roles.permissions JSONB augments — additive overrides only,
 *      never revokes a baseline.
 *   4. No admin_roles row → deny entirely (no fall-through to profiles.role).
 *   5. profiles.role='parent' (or any non-admin) → deny.
 *   6. Stale profiles.role='super_admin' (impossible after mig 094 CHECK,
 *      but defensively tested) → deny.
 */
import { describe, expect, it } from "vitest"
import {
  buildAdminInfo,
  roleHasPermission,
  ADMIN_PERMISSIONS,
} from "@/lib/auth/admin-permissions"

const PROFILE_BASE = {
  id: "p-1",
  email: "admin@test.local",
  full_name: "Admin Test",
}

describe("buildAdminInfo — sub-role + override semantics", () => {
  it("super_admin gets every permission in the matrix", () => {
    const info = buildAdminInfo({
      profile: { ...PROFILE_BASE, role: "admin" },
      adminRole: { role: "super_admin", permissions: null },
    })
    expect(info).not.toBeNull()
    expect(info!.subRole).toBe("super_admin")
    for (const perm of Object.keys(ADMIN_PERMISSIONS)) {
      expect(info!.permissions[perm]).toBe(true)
    }
  })

  it("support sub-role gets only the support-allowed permissions", () => {
    const info = buildAdminInfo({
      profile: { ...PROFILE_BASE, role: "admin" },
      adminRole: { role: "support", permissions: null },
    })
    expect(info).not.toBeNull()
    expect(info!.subRole).toBe("support")

    // Support is allowed: dashboard.view, users.view, events.view,
    // reservations.view, reservations.checkin, support.tickets,
    // support.reply.
    expect(info!.permissions["dashboard.view"]).toBe(true)
    expect(info!.permissions["users.view"]).toBe(true)
    expect(info!.permissions["support.tickets"]).toBe(true)
    expect(info!.permissions["support.reply"]).toBe(true)

    // Support is NOT allowed any of these.
    expect(info!.permissions["users.delete"]).toBe(false)
    expect(info!.permissions["users.change_role"]).toBe(false)
    expect(info!.permissions["partners.view"]).toBe(false)
    expect(info!.permissions["analytics.financial"]).toBe(false)
    expect(info!.permissions["system.sql"]).toBe(false)
  })

  it("admin sub-role + JSONB override grants extra permission additively", () => {
    const info = buildAdminInfo({
      profile: { ...PROFILE_BASE, role: "admin" },
      adminRole: {
        role: "admin",
        permissions: { "reservations.refund": true, "system.sql": true },
      },
    })
    expect(info).not.toBeNull()
    // Baseline: admin sub-role already has reservations.refund per matrix.
    expect(info!.permissions["reservations.refund"]).toBe(true)
    // Override: admin does NOT have system.sql by default, but the JSONB
    // grant makes it true.
    expect(info!.permissions["system.sql"]).toBe(true)
    // Baseline still holds for unrelated entries.
    expect(info!.permissions["dashboard.view"]).toBe(true)
  })

  it("override CANNOT revoke a baseline permission (additive-only)", () => {
    const info = buildAdminInfo({
      profile: { ...PROFILE_BASE, role: "admin" },
      adminRole: {
        role: "super_admin",
        // Even if a hostile JSONB tries to revoke, additive-only ignores it.
        permissions: { "system.sql": false, "users.delete": false },
      },
    })
    expect(info).not.toBeNull()
    expect(info!.permissions["system.sql"]).toBe(true)
    expect(info!.permissions["users.delete"]).toBe(true)
  })

  it("missing admin_roles row denies entirely (no profiles.role fallback)", () => {
    const info = buildAdminInfo({
      profile: { ...PROFILE_BASE, role: "admin" },
      adminRole: null,
    })
    expect(info).toBeNull()
  })

  it("profiles.role='parent' is denied even with an admin_roles row present", () => {
    const info = buildAdminInfo({
      profile: { ...PROFILE_BASE, role: "parent" },
      adminRole: { role: "super_admin", permissions: null },
    })
    expect(info).toBeNull()
  })

  it("legacy profiles.role='super_admin' is denied (mig 094 invariant defended in code)", () => {
    // Migration 094 CHECK constraint rejects this row at the DB layer — but
    // a defensive code path also denies it so a stale read can't elevate.
    const info = buildAdminInfo({
      profile: { ...PROFILE_BASE, role: "super_admin" },
      adminRole: { role: "super_admin", permissions: null },
    })
    expect(info).toBeNull()
  })

  it("admin_roles.role with an unknown sub-role value is denied", () => {
    const info = buildAdminInfo({
      profile: { ...PROFILE_BASE, role: "admin" },
      adminRole: { role: "godmode", permissions: null },
    })
    expect(info).toBeNull()
  })

  it("null profile is denied", () => {
    const info = buildAdminInfo({ profile: null, adminRole: null })
    expect(info).toBeNull()
  })
})

describe("roleHasPermission — capability matrix sanity", () => {
  it("super_admin has system.permissions; admin does not", () => {
    expect(roleHasPermission("super_admin", "system.permissions")).toBe(true)
    expect(roleHasPermission("admin", "system.permissions")).toBe(false)
  })

  it("moderator can edit users but cannot delete them", () => {
    expect(roleHasPermission("moderator", "users.edit")).toBe(true)
    expect(roleHasPermission("moderator", "users.delete")).toBe(false)
  })

  it("support sees dashboard but cannot approve partners", () => {
    expect(roleHasPermission("support", "dashboard.view")).toBe(true)
    expect(roleHasPermission("support", "partners.approve")).toBe(false)
  })
})
