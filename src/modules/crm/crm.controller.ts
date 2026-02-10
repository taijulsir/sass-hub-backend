import { Response, NextFunction } from 'express';
import { CrmService } from './crm.service';
import { AuthenticatedRequest } from '../../types/interfaces';
import { sendSuccess } from '../../utils/response';
import { HttpStatus } from '../../utils/api-error';
import { LeadStatus } from '../../types/enums';

export class CrmController {
  // Create lead
  static async create(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const organizationId = req.params.organizationId || req.membership?.organizationId;
      const lead = await CrmService.createLead(
        organizationId!,
        req.user!.userId,
        req.body
      );

      sendSuccess(res, { lead }, 'Lead created successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  // Get lead by ID
  static async getById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId, leadId } = req.params;
      const lead = await CrmService.getById(leadId, organizationId);

      sendSuccess(res, { lead });
    } catch (error) {
      next(error);
    }
  }

  // Get leads
  static async getLeads(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { status, assignedTo, search, page, limit } = req.query as Record<string, string>;

      const result = await CrmService.getLeads({
        organizationId,
        status: status as LeadStatus,
        assignedTo,
        search,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  // Update lead
  static async update(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId, leadId } = req.params;
      const lead = await CrmService.updateLead(
        leadId,
        organizationId,
        req.user!.userId,
        req.body
      );

      sendSuccess(res, { lead }, 'Lead updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Delete lead
  static async delete(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId, leadId } = req.params;
      await CrmService.deleteLead(leadId, organizationId, req.user!.userId);

      sendSuccess(res, null, 'Lead deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // Get lead statistics
  static async getStatistics(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const statistics = await CrmService.getStatistics(organizationId);

      sendSuccess(res, { statistics });
    } catch (error) {
      next(error);
    }
  }
}
