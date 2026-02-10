import { Response, NextFunction } from 'express';
import { AuditService } from './audit.service';
import { AuthenticatedRequest } from '../../types/interfaces';
import { sendSuccess } from '../../utils/response';
import { AuditAction } from '../../types/enums';

export class AuditController {
  // Get audit logs for organization
  static async getOrganizationLogs(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { userId, action, resource, startDate, endDate, page, limit } = req.query as Record<string, string>;

      const result = await AuditService.getOrganizationLogs(organizationId, {
        userId,
        action: action as AuditAction,
        resource,
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

  // Get my audit logs
  static async getMyLogs(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { action, resource, startDate, endDate, page, limit } = req.query as Record<string, string>;

      const result = await AuditService.getUserLogs(req.user!.userId, {
        action: action as AuditAction,
        resource,
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
}
