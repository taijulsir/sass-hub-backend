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

// Users
router.get('/users', AdminController.getUsers);

// Plans
router.get('/plans', AdminController.getPlans);
router.post('/plans', validateBody(createPlanDto), AdminController.createPlan);

export default router;
