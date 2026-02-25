import { Response, NextFunction } from 'express';
import { PlanService } from './plan.service';
import { AuthenticatedRequest } from '../../types/interfaces';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { HttpStatus } from '../../utils/api-error';

export class PlanController {
  // Get all plans (admin — paginated, includes inactive)
  static async getPlans(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, search, includeInactive } = req.query as Record<string, string>;
      const result = await PlanService.getPlans({
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        search,
        includeInactive: includeInactive === 'true',
      });

      sendPaginated(
        res,
        result.data,
        result.pagination.total,
        result.pagination.page,
        result.pagination.limit,
        'Plans fetched successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  // Get all active plans (lightweight dropdown)
  static async getActivePlans(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plans = await PlanService.getActivePlans();
      sendSuccess(res, { plans });
    } catch (error) {
      next(error);
    }
  }

  // Get public plans (landing page)
  static async getPublicPlans(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plans = await PlanService.getPublicPlans();
      sendSuccess(res, { plans });
    } catch (error) {
      next(error);
    }
  }

  // Get single plan
  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await PlanService.getById(req.params.planId);
      sendSuccess(res, { plan });
    } catch (error) {
      next(error);
    }
  }

  // Create plan
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await PlanService.create(req.body);
      sendSuccess(res, { plan }, 'Plan created successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  // Update plan
  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await PlanService.update(req.params.planId, req.body);
      sendSuccess(res, { plan }, 'Plan updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Toggle plan active status
  static async toggleActive(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await PlanService.toggleActive(req.params.planId);
      sendSuccess(res, { plan }, `Plan ${plan.isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      next(error);
    }
  }

  // Archive plan (soft delete)
  static async archive(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await PlanService.archive(req.params.planId);
      sendSuccess(res, { plan }, 'Plan archived successfully');
    } catch (error) {
      next(error);
    }
  }
}
