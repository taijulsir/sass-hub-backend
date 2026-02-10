import { Router } from 'express';
import { OrganizationController } from './organization.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { loadMembership, requirePermission, requireOwner } from '../../middlewares/rbac.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { createOrganizationDto, updateOrganizationDto } from './organization.dto';
import { Permission } from '../../types/enums';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create organization
router.post('/', validateBody(createOrganizationDto), OrganizationController.create);

// Get organization by ID
router.get('/:organizationId', loadMembership, OrganizationController.getById);

// Update organization
router.patch(
  '/:organizationId',
  loadMembership,
  requirePermission(Permission.ORG_MANAGE),
  validateBody(updateOrganizationDto),
  OrganizationController.update
);

// Delete organization (owner only)
router.delete(
  '/:organizationId',
  loadMembership,
  requireOwner,
  OrganizationController.delete
);

// Get organization members
router.get(
  '/:organizationId/members',
  loadMembership,
  requirePermission(Permission.USER_VIEW),
  OrganizationController.getMembers
);

export default router;
