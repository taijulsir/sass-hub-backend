import { Router } from 'express';
import { AuditController } from './audit.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { loadMembership, requirePermission } from '../../middlewares/rbac.middleware';
import { Permission } from '../../types/enums';

const router = Router();

// Get my audit logs
router.get('/me', authenticate, AuditController.getMyLogs);

// Get organization audit logs
router.get(
  '/organization/:organizationId',
  authenticate,
  loadMembership,
  requirePermission(Permission.AUDIT_READ),
  AuditController.getOrganizationLogs
);

export default router;
