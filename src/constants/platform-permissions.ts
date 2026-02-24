/**
 * PLATFORM_PERMISSIONS
 * ---------------------
 * Hardcoded, stable permission identifiers used across the admin panel.
 * These are the atomic actions that can be granted to platform roles.
 *
 * NEVER remove or rename existing values — treat them as DB foreign keys.
 * Add new ones at the bottom of each group as the product grows.
 */
export const PLATFORM_PERMISSIONS = {
  // ── Organizations ─────────────────────────────────────────────
  ORG_VIEW:     'ORG_VIEW',
  ORG_CREATE:   'ORG_CREATE',
  ORG_EDIT:     'ORG_EDIT',
  ORG_SUSPEND:  'ORG_SUSPEND',
  ORG_DELETE:   'ORG_DELETE',

  // ── Plans ─────────────────────────────────────────────────────
  PLAN_VIEW:    'PLAN_VIEW',
  PLAN_CREATE:  'PLAN_CREATE',
  PLAN_CHANGE:  'PLAN_CHANGE',

  // ── Subscriptions ─────────────────────────────────────────────
  SUBSCRIPTION_VIEW: 'SUBSCRIPTION_VIEW',

  // ── Analytics ─────────────────────────────────────────────────
  ANALYTICS_VIEW: 'ANALYTICS_VIEW',

  // ── Audit Logs ────────────────────────────────────────────────
  AUDIT_VIEW: 'AUDIT_VIEW',

  // ── Admin Users ───────────────────────────────────────────────
  ADMIN_VIEW:    'ADMIN_VIEW',
  ADMIN_INVITE:  'ADMIN_INVITE',
  ADMIN_EDIT:    'ADMIN_EDIT',
  ADMIN_SUSPEND: 'ADMIN_SUSPEND',

  // ── Designations (Platform Roles) ─────────────────────────────
  DESIGNATION_VIEW:    'DESIGNATION_VIEW',
  DESIGNATION_CREATE:  'DESIGNATION_CREATE',
  DESIGNATION_EDIT:    'DESIGNATION_EDIT',
  DESIGNATION_ARCHIVE: 'DESIGNATION_ARCHIVE',
} as const;

/** Union type of all permission strings */
export type PlatformPermissionKey = typeof PLATFORM_PERMISSIONS[keyof typeof PLATFORM_PERMISSIONS];

/** All permission values as an array — used in seeding */
export const ALL_PLATFORM_PERMISSIONS = Object.values(PLATFORM_PERMISSIONS) as PlatformPermissionKey[];

/** Module label for each permission — used in UI grouping */
export const PERMISSION_MODULE_MAP: Record<PlatformPermissionKey, string> = {
  ORG_VIEW:            'ORG',
  ORG_CREATE:          'ORG',
  ORG_EDIT:            'ORG',
  ORG_SUSPEND:         'ORG',
  ORG_DELETE:          'ORG',
  PLAN_VIEW:           'PLAN',
  PLAN_CREATE:         'PLAN',
  PLAN_CHANGE:         'PLAN',
  SUBSCRIPTION_VIEW:   'SUBSCRIPTION',
  ANALYTICS_VIEW:      'ANALYTICS',
  AUDIT_VIEW:          'AUDIT',
  ADMIN_VIEW:          'ADMIN',
  ADMIN_INVITE:        'ADMIN',
  ADMIN_EDIT:          'ADMIN',
  ADMIN_SUSPEND:       'ADMIN',
  DESIGNATION_VIEW:    'DESIGNATION',
  DESIGNATION_CREATE:  'DESIGNATION',
  DESIGNATION_EDIT:    'DESIGNATION',
  DESIGNATION_ARCHIVE: 'DESIGNATION',
};
