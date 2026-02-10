import { Router } from 'express';
import { MembershipController } from './membership.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { loadMembership, requirePermission, requireOwner } from '../../middlewares/rbac.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { changeMemberRoleDto } from './membership.dto';
import { Permission } from '../../types/enums';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Change member role
router.patch(
  '/:organizationId/members/:memberId/role',
  loadMembership,
  requirePermission(Permission.USER_INVITE),
  validateBody(changeMemberRoleDto),
  MembershipController.changeRole
);

// Remove member
router.delete(
  '/:organizationId/members/:memberId',
  loadMembership,
  requirePermission(Permission.USER_REMOVE),
  MembershipController.removeMember
);

// Leave organization
router.post(
  '/:organizationId/leave',
  loadMembership,
  MembershipController.leave
);

// Transfer ownership (owner only)
router.post(
  '/:organizationId/transfer-ownership',
  loadMembership,
  requireOwner,
  MembershipController.transferOwnership
);

export default router;
