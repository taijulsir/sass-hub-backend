import { Router } from 'express';
import { SubscriptionController } from './subscription.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { loadMembership, requirePermission, requireOwner } from '../../middlewares/rbac.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { changeSubscriptionPlanDto, cancelSubscriptionDto } from './subscription.dto';
import { Permission } from '../../types/enums';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get subscription
router.get(
  '/:organizationId',
  loadMembership,
  requirePermission(Permission.SUBSCRIPTION_VIEW),
  SubscriptionController.get
);

// Get subscription history
router.get(
  '/:organizationId/history',
  loadMembership,
  requirePermission(Permission.SUBSCRIPTION_VIEW),
  SubscriptionController.getHistory
);

// Change plan (owner only)
router.patch(
  '/:organizationId/plan',
  loadMembership,
  requireOwner,
  validateBody(changeSubscriptionPlanDto),
  SubscriptionController.changePlan
);

// Cancel subscription (owner only)
router.post(
  '/:organizationId/cancel',
  loadMembership,
  requireOwner,
  validateBody(cancelSubscriptionDto),
  SubscriptionController.cancel
);

export default router;
