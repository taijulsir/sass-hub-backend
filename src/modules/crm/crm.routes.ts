import { Router } from 'express';
import { CrmController } from './crm.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { loadMembership, requirePermission } from '../../middlewares/rbac.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { createLeadDto, updateLeadDto } from './crm.dto';
import { Permission } from '../../types/enums';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get leads
router.get(
  '/:organizationId/leads',
  loadMembership,
  requirePermission(Permission.CRM_READ),
  CrmController.getLeads
);

// Get lead statistics
router.get(
  '/:organizationId/leads/statistics',
  loadMembership,
  requirePermission(Permission.CRM_READ),
  CrmController.getStatistics
);

// Get single lead
router.get(
  '/:organizationId/leads/:leadId',
  loadMembership,
  requirePermission(Permission.CRM_READ),
  CrmController.getById
);

// Create lead
router.post(
  '/:organizationId/leads',
  loadMembership,
  requirePermission(Permission.CRM_WRITE),
  validateBody(createLeadDto),
  CrmController.create
);

// Update lead
router.patch(
  '/:organizationId/leads/:leadId',
  loadMembership,
  requirePermission(Permission.CRM_WRITE),
  validateBody(updateLeadDto),
  CrmController.update
);

// Delete lead
router.delete(
  '/:organizationId/leads/:leadId',
  loadMembership,
  requirePermission(Permission.CRM_WRITE),
  CrmController.delete
);

export default router;
