import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate, requireSuperAdmin } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { adminChangeOrgStatusDto, adminChangeOrgPlanDto, createPlanDto } from './admin.dto';

const router = Router();

// All admin routes require authentication and super admin role
router.use(authenticate);
router.use(requireSuperAdmin);

// Dashboard
router.get('/dashboard', AdminController.getDashboard);

// Organizations
router.get('/organizations', AdminController.getOrganizations);
router.post('/organizations', AdminController.createOrganization);
router.get('/organizations/:organizationId', AdminController.getOrganizationDetails);
router.patch(
  '/organizations/:organizationId/status',
  validateBody(adminChangeOrgStatusDto),
  AdminController.changeOrgStatus
);
router.patch(
  '/organizations/:organizationId/plan',
  validateBody(adminChangeOrgPlanDto),
  AdminController.changeOrgPlan
);
router.patch('/organizations/:organizationId', AdminController.updateOrganization);
router.delete('/organizations/:organizationId', AdminController.archiveOrganization);

// Users
router.get('/users', AdminController.getUsers);
router.post('/users', AdminController.createUser);
router.post('/users/invite', AdminController.inviteUser);
router.patch('/users/:userId', AdminController.updateUser);
router.delete('/users/:userId', AdminController.archiveUser);

// Plans
router.get('/plans', AdminController.getPlans);
router.post('/plans', validateBody(createPlanDto), AdminController.createPlan);

// Audit Logs
router.get('/audit-logs', AdminController.getAuditLogs);

// Analytics
router.get('/analytics', AdminController.getAnalytics);

// Settings
router.get('/settings', AdminController.getSettings);
router.put('/settings', AdminController.updateSettings);

export default router;
