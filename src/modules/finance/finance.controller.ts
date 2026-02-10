import { Response, NextFunction } from 'express';
import { FinanceService } from './finance.service';
import { AuthenticatedRequest } from '../../types/interfaces';
import { sendSuccess } from '../../utils/response';
import { HttpStatus } from '../../utils/api-error';
import { FinanceEntryType } from '../../types/enums';

export class FinanceController {
  // Create entry
  static async create(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const entry = await FinanceService.createEntry(
        organizationId,
        req.user!.userId,
        req.body
      );

      sendSuccess(res, { entry }, 'Financial entry created', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  // Get entry by ID
  static async getById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId, entryId } = req.params;
      const entry = await FinanceService.getById(entryId, organizationId);

      sendSuccess(res, { entry });
    } catch (error) {
      next(error);
    }
  }

  // Get entries
  static async getEntries(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { type, category, startDate, endDate, page, limit } = req.query as Record<string, string>;

      const result = await FinanceService.getEntries({
        organizationId,
        type: type as FinanceEntryType,
        category,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  // Update entry
  static async update(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId, entryId } = req.params;
      const entry = await FinanceService.updateEntry(
        entryId,
        organizationId,
        req.user!.userId,
        req.body
      );

      sendSuccess(res, { entry }, 'Financial entry updated');
    } catch (error) {
      next(error);
    }
  }

  // Delete entry
  static async delete(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId, entryId } = req.params;
      await FinanceService.deleteEntry(entryId, organizationId, req.user!.userId);

      sendSuccess(res, null, 'Financial entry deleted');
    } catch (error) {
      next(error);
    }
  }

  // Get monthly summary
  static async getMonthlySummary(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { month } = req.query as { month: string };

      const summary = await FinanceService.getMonthlySummary(organizationId, month);

      sendSuccess(res, { summary });
    } catch (error) {
      next(error);
    }
  }

  // Get yearly summary
  static async getYearlySummary(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { year } = req.query as { year: string };

      const summaries = await FinanceService.getYearlySummary(
        organizationId,
        parseInt(year)
      );

      sendSuccess(res, { summaries });
    } catch (error) {
      next(error);
    }
  }

  // Get categories
  static async getCategories(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const categories = await FinanceService.getCategories(organizationId);

      sendSuccess(res, { categories });
    } catch (error) {
      next(error);
    }
  }
}
