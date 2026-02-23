import { Router } from 'express';
import { RoleController } from './role.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { loadMembership } from '../../middlewares/rbac.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { Permission } from '../../types/enums';

const router = Router();

// Apply auth and membership loading to all routes
// Assuming these routes are mounted under /api/v1/:organizationId/roles
router.use('/:organizationId/roles', authenticate, loadMembership);

router.post(
  '/:organizationId/roles',
  // You might want a specific permission for Managing Roles, currently using ORG_MANAGE
  requirePermission(Permission.ORG_MANAGE),
  RoleController.create
);

router.put(
  '/:organizationId/roles/:roleId',
  requirePermission(Permission.ORG_MANAGE),
  RoleController.update
);

router.delete(
  '/:organizationId/roles/:roleId',
  requirePermission(Permission.ORG_MANAGE),
  RoleController.delete
);

router.get(
  '/:organizationId/roles',
  requirePermission(Permission.ORG_VIEW), 
  RoleController.getAll
);

export default router;
