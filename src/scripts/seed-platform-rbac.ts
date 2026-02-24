/**
 * seed-platform-rbac.ts
 * ---------------------
 * Idempotent seed script for the Platform RBAC system.
 *
 * Run:
 *   npx ts-node -r tsconfig-paths/register src/scripts/seed-platform-rbac.ts
 *
 * What it does:
 *   1. Upsert all PLATFORM_PERMISSIONS into PlatformPermission collection
 *   2. Upsert 3 system roles: SUPER_ADMIN, SUPPORT_ADMIN, FINANCE_ADMIN
 *   3. Assign permissions to roles (replaces existing)
 *   4. Logs summary to console — safe to run multiple times
 */

import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../config/logger';
import {
  ALL_PLATFORM_PERMISSIONS,
  PLATFORM_PERMISSIONS,
  PERMISSION_MODULE_MAP,
} from '../constants/platform-permissions';
import { PlatformPermission } from '../modules/platform-rbac/platform-permission.model';
import { PlatformRole } from '../modules/platform-rbac/platform-role.model';
import { PlatformRolePermission } from '../modules/platform-rbac/platform-role-permission.model';
import { UserPlatformRole } from '../modules/platform-rbac/user-platform-role.model';
import { User } from '../modules/user/user.model';

// ── Role → Permission mapping ─────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ALL_PLATFORM_PERMISSIONS, // gets everything

  SUPPORT_ADMIN: [
    PLATFORM_PERMISSIONS.ORG_VIEW,
    PLATFORM_PERMISSIONS.AUDIT_VIEW,
    PLATFORM_PERMISSIONS.ADMIN_VIEW,
  ],

  FINANCE_ADMIN: [
    PLATFORM_PERMISSIONS.ANALYTICS_VIEW,
    PLATFORM_PERMISSIONS.SUBSCRIPTION_VIEW,
    PLATFORM_PERMISSIONS.PLAN_VIEW,
  ],
};

// ── Seeding logic ─────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  await mongoose.connect(env.mongodbUri);
  logger.info('MongoDB connected — starting Platform RBAC seed');

  // ── 1. Upsert permissions ──────────────────────────────────────────────
  const permUpserts = await Promise.all(
    ALL_PLATFORM_PERMISSIONS.map((name) =>
      PlatformPermission.findOneAndUpdate(
        { name },
        {
          name,
          module: PERMISSION_MODULE_MAP[name],
          description: `Allows: ${name.replace(/_/g, ' ').toLowerCase()}`,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  );
  logger.info(`✓ Permissions upserted: ${permUpserts.length}`);

  // Build name → ObjectId lookup
  const permMap: Record<string, mongoose.Types.ObjectId> = {};
  for (const perm of permUpserts) {
    if (perm) permMap[perm.name] = perm._id as mongoose.Types.ObjectId;
  }

  // ── 2. Upsert roles ───────────────────────────────────────────────────
  const roleNames = Object.keys(ROLE_PERMISSIONS);
  const roleUpserts = await Promise.all(
    roleNames.map((name) =>
      PlatformRole.findOneAndUpdate(
        { name },
        {
          name,
          description: getRoleDescription(name),
          isSystem: true,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  );
  logger.info(`✓ Roles upserted: ${roleUpserts.length}`);

  // Build name → ObjectId lookup
  const roleMap: Record<string, mongoose.Types.ObjectId> = {};
  for (const role of roleUpserts) {
    if (role) roleMap[role.name] = role._id as mongoose.Types.ObjectId;
  }

  // ── 3. Assign permissions to roles ───────────────────────────────────
  let totalMappings = 0;
  for (const [roleName, permNames] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleMap[roleName];
    if (!roleId) continue;

    // Delete old mappings for this role (full replace = idempotent)
    await PlatformRolePermission.deleteMany({ roleId });

    const docs = permNames
      .filter((p) => permMap[p])
      .map((p) => ({ roleId, permissionId: permMap[p] }));

    if (docs.length > 0) {
      await PlatformRolePermission.insertMany(docs, { ordered: false });
    }

    totalMappings += docs.length;
    logger.info(`  ${roleName}: ${docs.length} permissions assigned`);
  }

  logger.info(`✓ Role-permission mappings created: ${totalMappings}`);

  // ── 4. Auto-assign SUPER_ADMIN platform role to all globalRole=SUPER_ADMIN users ──
  const superAdminRoleId = roleMap['SUPER_ADMIN'];
  if (superAdminRoleId) {
    const superAdminUsers = await User.find({ globalRole: 'SUPER_ADMIN' }).select('_id email').lean();
    let assigned = 0;
    for (const u of superAdminUsers) {
      const result = await UserPlatformRole.updateOne(
        { userId: u._id, roleId: superAdminRoleId },
        { $setOnInsert: { userId: u._id, roleId: superAdminRoleId, assignedBy: u._id } },
        { upsert: true }
      );
      if (result.upsertedCount > 0) {
        logger.info(`  Auto-assigned SUPER_ADMIN role to ${(u as any).email}`);
        assigned++;
      }
    }
    logger.info(`✓ SUPER_ADMIN users ensured: ${superAdminUsers.length} checked, ${assigned} newly assigned`);
  }

  logger.info('Platform RBAC seed complete ✅');
  await mongoose.disconnect();
}

function getRoleDescription(name: string): string {
  switch (name) {
    case 'SUPER_ADMIN':   return 'Full access to all platform features';
    case 'SUPPORT_ADMIN': return 'Can view organizations, audit logs, and admin users';
    case 'FINANCE_ADMIN': return 'Can view analytics, subscriptions, and plans';
    default:              return name;
  }
}

seed().catch((err) => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
