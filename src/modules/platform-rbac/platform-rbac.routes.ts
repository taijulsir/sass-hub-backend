import { Router } from 'express';
import { PlatformRbacController } from './platform-rbac.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { checkPlatformPermission } from './platform-rbac.middleware';
import { PLATFORM_PERMISSIONS } from '../../constants/platform-permissions';

const router = Router();

// All platform-rbac routes require authentication
router.use(authenticate);

// ── Permissions (read-only listing for UI) ──────────────────────────────────
router.get(
  '/permissions',
  checkPlatformPermission(PLATFORM_PERMISSIONS.DESIGNATION_VIEW),
  PlatformRbacController.getAllPermissions
);

// ── Roles ────────────────────────────────────────────────────────────────────
router.get(
  '/roles',
  checkPlatformPermission(PLATFORM_PERMISSIONS.DESIGNATION_VIEW),
  PlatformRbacController.getRoles
);

router.get(
  '/roles/:roleId',
  checkPlatformPermission(PLATFORM_PERMISSIONS.DESIGNATION_VIEW),
  PlatformRbacController.getRole
);

router.post(
  '/roles',
  checkPlatformPermission(PLATFORM_PERMISSIONS.DESIGNATION_CREATE),
  PlatformRbacController.createRole
);

router.patch(
  '/roles/:roleId/permissions',
  checkPlatformPermission(PLATFORM_PERMISSIONS.DESIGNATION_EDIT),
  PlatformRbacController.updateRolePermissions
);

router.delete(
  '/roles/:roleId',
  checkPlatformPermission(PLATFORM_PERMISSIONS.DESIGNATION_ARCHIVE),
  PlatformRbacController.deleteRole
);

// ── User Role Assignment ─────────────────────────────────────────────────────
router.get(
  '/users/:userId/roles',
  checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_VIEW),
  PlatformRbacController.getUserRoles
);

router.get(
  '/users/:userId/permissions',
  checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_VIEW),
  PlatformRbacController.getUserPermissions
);

router.post(
  '/users/:userId/roles',
  checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_INVITE),
  PlatformRbacController.assignRoleToUser
);

router.delete(
  '/users/:userId/roles/:roleId',
  checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_SUSPEND),
  PlatformRbacController.removeRoleFromUser
);

export default router;
