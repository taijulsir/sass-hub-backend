import { Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { AuthenticatedRequest } from '../../types/interfaces';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { HttpStatus } from '../../utils/api-error';
import { OrgStatus } from '../../types/enums';

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
      const { status, search, page, limit, isActive } = req.query as Record<string, string>;

      const result = await AdminService.getOrganizations({
        status: status as OrgStatus,
        search,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        isActive: isActive !== undefined ? isActive === 'true' : true,
      });

      sendPaginated(
        res,
        result.data,
        result.pagination.total,
        result.pagination.page,
        result.pagination.limit,
        'Organizations fetched successfully'
      );
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
      const { planId, reason } = req.body;

      const subscription = await AdminService.changeOrgPlan(
        organizationId,
        planId,
        req.user!.userId,
        reason
      );

      sendSuccess(res, { subscription }, 'Organization plan updated');
    } catch (error) {
      next(error);
    }
  }

  // Create organization (Admin)
  static async createOrganization(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const organization = await AdminService.createOrganization(req.body, req.user!.userId);
      sendSuccess(res, { organization }, 'Organization created successfully', HttpStatus.CREATED);
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
      const { search, page, limit, tab } = req.query as Record<string, string>;

      const result = await AdminService.getUsers({
        search,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        tab: tab || 'active',
      });

      sendPaginated(
        res,
        result.data,
        result.pagination.total,
        result.pagination.page,
        result.pagination.limit,
        'Users fetched successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  // Check email status
  static async checkEmailStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email } = req.query as Record<string, string>;
      const status = await AdminService.checkEmailStatus(email);
      sendSuccess(res, status);
    } catch (error) {
      next(error);
    }
  }

  // Cancel invitation
  static async cancelInvitation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { invitationId } = req.params;
      await AdminService.cancelInvitation(invitationId, req.user!.userId);
      sendSuccess(res, null, 'Invitation cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  // Archive user
  static async archiveUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;
      await AdminService.archiveUser(userId, req.user!.userId);
      sendSuccess(res, null, 'User archived successfully');
    } catch (error) {
      next(error);
    }
  }

  // Suspense user
  static async suspenseUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const { note } = req.body;
      await AdminService.suspenseUser(userId, req.user!.userId, note);
      sendSuccess(res, null, 'User suspended successfully');
    } catch (error) {
      next(error);
    }
  }

  // Restore user (un-suspend)
  static async restoreUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;
      await AdminService.restoreUser(userId, req.user!.userId);
      sendSuccess(res, null, 'User restored successfully');
    } catch (error) {
      next(error);
    }
  }

  // Force logout — clears all active sessions for a user
  static async forceLogout(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;
      await AdminService.forceLogout(userId, req.user!.userId);
      sendSuccess(res, null, 'User sessions invalidated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Unarchive user (re-activate)
  static async unarchiveUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;
      await AdminService.unarchiveUser(userId, req.user!.userId);
      sendSuccess(res, null, 'User unarchived successfully');
    } catch (error) {
      next(error);
    }
  }

  // Create user (Admin)
  static async createUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await AdminService.createUser(req.body, req.user!.userId);
      sendSuccess(res, { user }, 'User created successfully', HttpStatus.CREATED);
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

  // Seed default plans
  static async seedPlans(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AdminService.seedPlans();
      const message = result.created.length > 0
        ? `Seeded: ${result.created.join(', ')}${result.skipped.length ? `. Skipped (already exist): ${result.skipped.join(', ')}` : ''}`
        : `All plans already exist: ${result.skipped.join(', ')}`;
      sendSuccess(res, result, message, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  // Get audit logs
  static async getAuditLogs(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { page, limit, action, search, resource } = req.query as Record<string, string>;
      const result = await AdminService.getAuditLogs({
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        action,
        search,
        resource,
      });
      sendPaginated(
        res,
        result.data,
        result.pagination.total,
        result.pagination.page,
        result.pagination.limit,
        'Audit logs fetched successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  // Get analytics
  static async getAnalytics(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { startDate, endDate } = req.query as Record<string, string>;
      const analytics = await AdminService.getAnalytics({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });
      sendSuccess(res, { analytics });
    } catch (error) {
      next(error);
    }
  }

  // Get settings
  static async getSettings(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const settings = await AdminService.getSettings();
      sendSuccess(res, { settings });
    } catch (error) {
      next(error);
    }
  }

  // Update settings
  static async updateSettings(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const settings = await AdminService.updateSettings(req.body);
      sendSuccess(res, { settings }, 'Settings updated');
    } catch (error) {
      next(error);
    }
  }

  // Archive organization
  static async archiveOrganization(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const organization = await AdminService.archiveOrganization(
        organizationId,
        req.user!.userId
      );

      sendSuccess(res, { organization }, 'Organization archived successfully');
    } catch (error) {
      next(error);
    }
  }

  // Permanently delete organization
  static async permanentlyDeleteOrganization(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      await AdminService.permanentlyDeleteOrganization(
        organizationId,
        req.user!.userId
      );

      sendSuccess(res, null, 'Organization permanently deleted');
    } catch (error) {
      next(error);
    }
  }

  // Archive subscription
  static async archiveSubscription(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { subscriptionId } = req.params;
      await AdminService.archiveSubscription(
        subscriptionId,
        req.user!.userId
      );

      sendSuccess(res, null, 'Subscription archived successfully');
    } catch (error) {
      next(error);
    }
  }

  // Update organization
  static async updateOrganization(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const organization = await AdminService.updateOrganization(
        organizationId,
        req.body,
        req.user!.userId
      );

      sendSuccess(res, { organization }, 'Organization updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Update user
  static async updateUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const user = await AdminService.updateUser(
        userId,
        req.body,
        req.user!.userId
      );

      sendSuccess(res, { user }, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // ── Subscription Management ──────────────────────────────────────────────

  // Extend trial for an organization's subscription
  static async extendTrial(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { additionalDays, reason } = req.body;

      const subscription = await AdminService.extendTrial(
        organizationId,
        additionalDays,
        req.user!.userId,
        reason
      );

      sendSuccess(res, { subscription }, 'Trial extended successfully');
    } catch (error) {
      next(error);
    }
  }

  // Reactivate a canceled subscription
  static async reactivateSubscription(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { planId, billingCycle } = req.body;

      const subscription = await AdminService.reactivateSubscription(
        organizationId,
        planId,
        billingCycle,
        req.user!.userId
      );

      sendSuccess(res, { subscription }, 'Subscription reactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Cancel an organization's subscription
  static async cancelSubscription(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { reason } = req.body;

      const subscription = await AdminService.cancelSubscription(
        organizationId,
        req.user!.userId,
        reason
      );

      sendSuccess(res, { subscription }, 'Subscription cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  // Get subscription history for an organization
  static async getSubscriptionHistory(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const details = await AdminService.getSubscriptionDetails(organizationId);

      sendSuccess(res, details);
    } catch (error) {
      next(error);
    }
  }

  // Invite user (Admin)
  static async inviteUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AdminService.inviteUser(req.body, req.user!.userId);
      sendSuccess(res, result, 'Invitation sent successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  // Resend invitation
  static async resendInvite(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AdminService.resendInvite(req.params.invitationId, req.user!.userId);
      sendSuccess(res, result, 'Invitation resent successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}
