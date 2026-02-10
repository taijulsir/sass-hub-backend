import { Router } from 'express';
import { InvitationController } from './invitation.controller';
import { authenticate, optionalAuth } from '../../middlewares/auth.middleware';
import { loadMembership, requirePermission } from '../../middlewares/rbac.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { createInvitationDto, acceptInvitationDto } from './invitation.dto';
import { Permission } from '../../types/enums';

const router = Router();

// Public route - get invitation by token
router.get('/token/:token', optionalAuth, InvitationController.getByToken);

// Accept invitation (authenticated)
router.post('/accept', authenticate, validateBody(acceptInvitationDto), InvitationController.accept);

// Organization-specific routes
router.post(
  '/:organizationId',
  authenticate,
  loadMembership,
  requirePermission(Permission.USER_INVITE),
  validateBody(createInvitationDto),
  InvitationController.create
);

router.get(
  '/:organizationId',
  authenticate,
  loadMembership,
  requirePermission(Permission.USER_INVITE),
  InvitationController.getOrganizationInvitations
);

router.delete(
  '/:organizationId/:invitationId',
  authenticate,
  loadMembership,
  requirePermission(Permission.USER_INVITE),
  InvitationController.cancel
);

router.post(
  '/:organizationId/:invitationId/resend',
  authenticate,
  loadMembership,
  requirePermission(Permission.USER_INVITE),
  InvitationController.resend
);

export default router;
