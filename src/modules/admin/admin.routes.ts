import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { adminChangeOrgStatusDto, adminChangeOrgPlanDto, createPlanDto } from './admin.dto';
import { checkPlatformPermission } from '../platform-rbac/platform-rbac.middleware';
import { PLATFORM_PERMISSIONS } from '../../constants/platform-permissions';
import designationRoutes from '../designation/designation.routes';

const router = Router();

// All admin routes require a valid JWT — granular permission per route
router.use(authenticate);

// ── Dashboard ──────────────────────────────────────────────────────────────
router.get('/dashboard', checkPlatformPermission(PLATFORM_PERMISSIONS.ORG_VIEW), AdminController.getDashboard);

// ── Organizations ──────────────────────────────────────────────────────────
router.get('/organizations', checkPlatformPermission(PLATFORM_PERMISSIONS.ORG_VIEW), AdminController.getOrganizations);
router.post('/organizations', checkPlatformPermission(PLATFORM_PERMISSIONS.ORG_CREATE), AdminController.createOrganization);
router.get('/organizations/:organizationId', checkPlatformPermission(PLATFORM_PERMISSIONS.ORG_VIEW), AdminController.getOrganizationDetails);
router.patch(
  '/organizations/:organizationId/status',
  checkPlatformPermission(PLATFORM_PERMISSIONS.ORG_SUSPEND),
  validateBody(adminChangeOrgStatusDto),
  AdminController.changeOrgStatus
);
router.patch(
  '/organizations/:organizationId/plan',
  checkPlatformPermission(PLATFORM_PERMISSIONS.PLAN_CHANGE),
  validateBody(adminChangeOrgPlanDto),
  AdminController.changeOrgPlan
);
router.patch('/organizations/:organizationId', checkPlatformPermission(PLATFORM_PERMISSIONS.ORG_EDIT), AdminController.updateOrganization);
router.delete('/organizations/:organizationId', checkPlatformPermission(PLATFORM_PERMISSIONS.ORG_DELETE), AdminController.archiveOrganization);

// ── Admin Users ────────────────────────────────────────────────────────────
router.get('/users', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_VIEW), AdminController.getUsers);
router.get('/users/check-email', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_VIEW), AdminController.checkEmailStatus);
router.post('/users', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_INVITE), AdminController.createUser);
router.post('/users/invite', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_INVITE), AdminController.inviteUser);
router.patch('/users/:userId', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_EDIT), AdminController.updateUser);
router.patch('/users/:userId/archive', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_SUSPEND), AdminController.archiveUser);
router.patch('/users/:userId/suspense', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_SUSPEND), AdminController.suspenseUser);
router.patch('/users/:userId/restore', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_EDIT), AdminController.restoreUser);
router.patch('/users/:userId/designation', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_EDIT), AdminController.assignDesignation);
router.delete('/users/:userId', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_SUSPEND), AdminController.archiveUser);

// ── Plans ──────────────────────────────────────────────────────────────────
router.get('/plans', checkPlatformPermission(PLATFORM_PERMISSIONS.PLAN_VIEW), AdminController.getPlans);
router.post('/plans', checkPlatformPermission(PLATFORM_PERMISSIONS.PLAN_CREATE), validateBody(createPlanDto), AdminController.createPlan);

// ── Designations ───────────────────────────────────────────────────────────
router.use('/designations', checkPlatformPermission(PLATFORM_PERMISSIONS.DESIGNATION_VIEW), designationRoutes);

// ── Audit Logs ─────────────────────────────────────────────────────────────
router.get('/audit-logs', checkPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_VIEW), AdminController.getAuditLogs);

// ── Analytics ─────────────────────────────────────────────────────────────
router.get('/analytics', checkPlatformPermission(PLATFORM_PERMISSIONS.ANALYTICS_VIEW), AdminController.getAnalytics);

// ── Settings ───────────────────────────────────────────────────────────────
router.get('/settings', AdminController.getSettings);
router.put('/settings', AdminController.updateSettings);

export default router;
