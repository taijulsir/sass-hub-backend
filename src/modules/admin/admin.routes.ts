import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import {
  adminChangeOrgStatusDto,
  adminChangeOrgPlanDto,
  adminCreateOrganizationDto,
  adminExtendTrialDto,
  adminReactivateSubscriptionDto,
  adminCancelSubscriptionDto,
} from './admin.dto';
import { checkPlatformPermission } from '../platform-rbac/platform-rbac.middleware';
import { PLATFORM_PERMISSIONS } from '../../constants/platform-permissions';
import designationRoutes from '../admin-role/admin-role.routes';

const router = Router();

// All admin routes require a valid JWT — granular permission per route
router.use(authenticate);

// ── Dashboard ──────────────────────────────────────────────────────────────
router.get('/dashboard', checkPlatformPermission(PLATFORM_PERMISSIONS.ORG_VIEW), AdminController.getDashboard);

// ── Organizations ──────────────────────────────────────────────────────────
router.get('/organizations', checkPlatformPermission(PLATFORM_PERMISSIONS.ORG_VIEW), AdminController.getOrganizations);
router.post(
  '/organizations',
  checkPlatformPermission(PLATFORM_PERMISSIONS.ORG_CREATE),
  validateBody(adminCreateOrganizationDto),
  AdminController.createOrganization
);
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
router.delete('/organizations/:organizationId/permanent', checkPlatformPermission(PLATFORM_PERMISSIONS.ORG_DELETE), AdminController.permanentlyDeleteOrganization);

// ── Subscription Management (per organization) ────────────────────────────
router.get(
  '/organizations/:organizationId/subscription',
  checkPlatformPermission(PLATFORM_PERMISSIONS.ORG_VIEW),
  AdminController.getSubscriptionHistory
);
router.post(
  '/organizations/:organizationId/subscription/extend-trial',
  checkPlatformPermission(PLATFORM_PERMISSIONS.PLAN_CHANGE),
  validateBody(adminExtendTrialDto),
  AdminController.extendTrial
);
router.post(
  '/organizations/:organizationId/subscription/reactivate',
  checkPlatformPermission(PLATFORM_PERMISSIONS.PLAN_CHANGE),
  validateBody(adminReactivateSubscriptionDto),
  AdminController.reactivateSubscription
);
router.post(
  '/organizations/:organizationId/subscription/cancel',
  checkPlatformPermission(PLATFORM_PERMISSIONS.PLAN_CHANGE),
  validateBody(adminCancelSubscriptionDto),
  AdminController.cancelSubscription
);

// ── Admin Users ────────────────────────────────────────────────────────────
router.get('/users', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_VIEW), AdminController.getUsers);
router.get('/users/check-email', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_VIEW), AdminController.checkEmailStatus);
router.post('/users', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_INVITE), AdminController.createUser);
router.post('/users/invite', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_INVITE), AdminController.inviteUser);
router.post('/users/:invitationId/resend-invite', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_INVITE), AdminController.resendInvite);
router.delete('/users/:invitationId/cancel-invite', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_INVITE), AdminController.cancelInvitation);
router.patch('/users/:userId', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_EDIT), AdminController.updateUser);
router.patch('/users/:userId/archive', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_SUSPEND), AdminController.archiveUser);
router.patch('/users/:userId/unarchive', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_SUSPEND), AdminController.unarchiveUser);
router.patch('/users/:userId/suspense', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_SUSPEND), AdminController.suspenseUser);
router.patch('/users/:userId/restore', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_EDIT), AdminController.restoreUser);
router.patch('/users/:userId/force-logout', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_SUSPEND), AdminController.forceLogout);
router.delete('/users/:userId', checkPlatformPermission(PLATFORM_PERMISSIONS.ADMIN_SUSPEND), AdminController.archiveUser);

// ── Plans ──────────────────────────────────────────────────────────────────
router.get('/plans', checkPlatformPermission(PLATFORM_PERMISSIONS.PLAN_VIEW), AdminController.getPlans);
router.post('/plans/seed', checkPlatformPermission(PLATFORM_PERMISSIONS.PLAN_CREATE), AdminController.seedPlans);
router.post('/plans', checkPlatformPermission(PLATFORM_PERMISSIONS.PLAN_CREATE), AdminController.createPlan);

// ── Admin Roles (platform-level) ───────────────────────────────────────────
router.use('/roles', checkPlatformPermission(PLATFORM_PERMISSIONS.DESIGNATION_VIEW), designationRoutes);

// ── Audit Logs ─────────────────────────────────────────────────────────────
router.get('/audit-logs', checkPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_VIEW), AdminController.getAuditLogs);

// ── Analytics ─────────────────────────────────────────────────────────────
router.get('/analytics', checkPlatformPermission(PLATFORM_PERMISSIONS.ANALYTICS_VIEW), AdminController.getAnalytics);
router.get('/analytics/overview', checkPlatformPermission(PLATFORM_PERMISSIONS.ANALYTICS_VIEW), AdminController.getAnalyticsOverview);
router.get('/analytics/revenue-trend', checkPlatformPermission(PLATFORM_PERMISSIONS.ANALYTICS_VIEW), AdminController.getRevenueTrend);
router.get('/analytics/revenue-by-plan', checkPlatformPermission(PLATFORM_PERMISSIONS.ANALYTICS_VIEW), AdminController.getRevenueByPlan);
router.get('/analytics/subscription-stats', checkPlatformPermission(PLATFORM_PERMISSIONS.ANALYTICS_VIEW), AdminController.getSubscriptionStats);
router.get('/analytics/user-growth', checkPlatformPermission(PLATFORM_PERMISSIONS.ANALYTICS_VIEW), AdminController.getUserGrowth);
router.get('/analytics/org-growth', checkPlatformPermission(PLATFORM_PERMISSIONS.ANALYTICS_VIEW), AdminController.getOrgGrowth);
router.get('/analytics/churn', checkPlatformPermission(PLATFORM_PERMISSIONS.ANALYTICS_VIEW), AdminController.getChurnAnalysis);

// ── Settings ───────────────────────────────────────────────────────────────
router.get('/settings', AdminController.getSettings);
router.put('/settings', AdminController.updateSettings);

export default router;
