import { Router } from 'express';
import { PlanController } from './plan.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { createPlanDto, updatePlanDto } from './plan.dto';
import { checkPlatformPermission } from '../platform-rbac/platform-rbac.middleware';
import { PLATFORM_PERMISSIONS } from '../../constants/platform-permissions';

const router = Router();

// ── Public routes (no auth) ────────────────────────────────────────────────
// Used by landing page pricing section
router.get('/public', PlanController.getPublicPlans);

// ── Authenticated routes ───────────────────────────────────────────────────
router.use(authenticate);

// Lightweight list (for dropdowns in org creation, etc.)
router.get('/active', checkPlatformPermission(PLATFORM_PERMISSIONS.PLAN_VIEW), PlanController.getActivePlans);

// Admin CRUD
router.get('/', checkPlatformPermission(PLATFORM_PERMISSIONS.PLAN_VIEW), PlanController.getPlans);
router.get('/:planId', checkPlatformPermission(PLATFORM_PERMISSIONS.PLAN_VIEW), PlanController.getById);
router.post('/', checkPlatformPermission(PLATFORM_PERMISSIONS.PLAN_CREATE), validateBody(createPlanDto), PlanController.create);
router.patch('/:planId', checkPlatformPermission(PLATFORM_PERMISSIONS.PLAN_CHANGE), validateBody(updatePlanDto), PlanController.update);
router.patch('/:planId/toggle', checkPlatformPermission(PLATFORM_PERMISSIONS.PLAN_CHANGE), PlanController.toggleActive);
router.delete('/:planId', checkPlatformPermission(PLATFORM_PERMISSIONS.PLAN_CHANGE), PlanController.archive);

export default router;
