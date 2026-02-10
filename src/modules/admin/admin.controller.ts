import { Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { AuthenticatedRequest } from '../../types/interfaces';
import { sendSuccess } from '../../utils/response';
import { HttpStatus } from '../../utils/api-error';
import { OrgStatus, Plan } from '../../types/enums';

export class AdminController {
  // Get dashboard statistics
  static async getDashboard(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await AdminService.getDashboardStats();
      sendSuccess(res, { stats });
    } catch (error) {
      next(error);
    }
  }

  // Get all organizations
  static async getOrganizations(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { status, plan, search, page, limit } = req.query as Record<string, string>;

      const result = await AdminService.getOrganizations({
        status: status as OrgStatus,
        plan: plan as Plan,
        search,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  // Get organization details
  static async getOrganizationDetails(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const details = await AdminService.getOrganizationDetails(organizationId);

      sendSuccess(res, details);
    } catch (error) {
      next(error);
    }
  }

  // Change organization status
  static async changeOrgStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { status, reason } = req.body;

      const organization = await AdminService.changeOrgStatus(
        organizationId,
        status,
        req.user!.userId,
        reason
      );

      sendSuccess(res, { organization }, 'Organization status updated');
    } catch (error) {
      next(error);
    }
  }

  // Change organization plan
  static async changeOrgPlan(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { plan, reason } = req.body;

      const organization = await AdminService.changeOrgPlan(
        organizationId,
        plan,
        req.user!.userId,
        reason
      );

      sendSuccess(res, { organization }, 'Organization plan updated');
    } catch (error) {
      next(error);
    }
  }

  // Get all users
  static async getUsers(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { search, page, limit } = req.query as Record<string, string>;

      const result = await AdminService.getUsers({
        search,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  // Get all plans
  static async getPlans(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const plans = await AdminService.getPlans();
      sendSuccess(res, { plans });
    } catch (error) {
      next(error);
    }
  }

  // Create plan
  static async createPlan(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const plan = await AdminService.createPlan(req.body);
      sendSuccess(res, { plan }, 'Plan created successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }
}
