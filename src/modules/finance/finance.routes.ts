import { Router } from 'express';
import { FinanceController } from './finance.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { loadMembership, requirePermission } from '../../middlewares/rbac.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { createFinancialEntryDto, updateFinancialEntryDto } from './finance.dto';
import { Permission } from '../../types/enums';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get entries
router.get(
  '/:organizationId',
  loadMembership,
  requirePermission(Permission.FINANCE_READ),
  FinanceController.getEntries
);

// Get monthly summary
router.get(
  '/:organizationId/summary',
  loadMembership,
  requirePermission(Permission.FINANCE_READ),
  FinanceController.getMonthlySummary
);

// Get yearly summary
router.get(
  '/:organizationId/summary/yearly',
  loadMembership,
  requirePermission(Permission.FINANCE_READ),
  FinanceController.getYearlySummary
);

// Get categories
router.get(
  '/:organizationId/categories',
  loadMembership,
  requirePermission(Permission.FINANCE_READ),
  FinanceController.getCategories
);

// Get single entry
router.get(
  '/:organizationId/:entryId',
  loadMembership,
  requirePermission(Permission.FINANCE_READ),
  FinanceController.getById
);

// Create entry
router.post(
  '/:organizationId',
  loadMembership,
  requirePermission(Permission.FINANCE_WRITE),
  validateBody(createFinancialEntryDto),
  FinanceController.create
);

// Update entry
router.patch(
  '/:organizationId/:entryId',
  loadMembership,
  requirePermission(Permission.FINANCE_WRITE),
  validateBody(updateFinancialEntryDto),
  FinanceController.update
);

// Delete entry
router.delete(
  '/:organizationId/:entryId',
  loadMembership,
  requirePermission(Permission.FINANCE_WRITE),
  FinanceController.delete
);

export default router;
