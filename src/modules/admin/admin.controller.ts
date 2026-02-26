import { Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { AnalyticsService } from './analytics.service';
import { AdminSubscriptionService } from './admin-subscription.service';
import { AuthenticatedRequest } from '../../types/interfaces';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { HttpStatus } from '../../utils/api-error';
import { OrgStatus, SubscriptionStatus, BillingCycle, PaymentProvider, SubscriptionCreatedBy } from '../../types/enums';

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
      const {
        search, page, limit, tab,
        roles, statuses, emailVerified,
        lastLogin, lastLoginFrom, lastLoginTo,
        joinedFrom, joinedTo,
      } = req.query as Record<string, string>;

      const result = await AdminService.getUsers({
        search,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        tab: tab || 'active',
        roles,
        statuses,
        emailVerified,
        lastLogin,
        lastLoginFrom,
        lastLoginTo,
        joinedFrom,
        joinedTo,
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

  // Get analytics (legacy — kept for backwards compat)
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

  // ── Analytics v2 ────────────────────────────────────────────────────────

  static async getAnalyticsOverview(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { startDate, endDate } = req.query as Record<string, string>;
      const data = await AnalyticsService.getOverview({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  static async getRevenueTrend(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { startDate, endDate } = req.query as Record<string, string>;
      const data = await AnalyticsService.getRevenueTrend({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  static async getRevenueByPlan(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const data = await AnalyticsService.getRevenueByPlan();
      sendSuccess(res, { plans: data });
    } catch (error) {
      next(error);
    }
  }

  static async getSubscriptionStats(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { startDate, endDate } = req.query as Record<string, string>;
      const [statusStats, newVsCanceled, planDistribution] = await Promise.all([
        AnalyticsService.getSubscriptionStatusStats(),
        AnalyticsService.getNewVsCanceled({
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        }),
        AnalyticsService.getPlanDistribution(),
      ]);
      sendSuccess(res, { statusStats, newVsCanceled, planDistribution });
    } catch (error) {
      next(error);
    }
  }

  static async getUserGrowth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { startDate, endDate } = req.query as Record<string, string>;
      const [growth, roleDistribution] = await Promise.all([
        AnalyticsService.getUserGrowth({
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        }),
        AnalyticsService.getRoleDistribution(),
      ]);
      sendSuccess(res, { growth, roleDistribution });
    } catch (error) {
      next(error);
    }
  }

  static async getOrgGrowth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { startDate, endDate } = req.query as Record<string, string>;
      const [growth, topOrgs] = await Promise.all([
        AnalyticsService.getOrgGrowth({
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        }),
        AnalyticsService.getTopOrgsByRevenue(),
      ]);
      sendSuccess(res, { growth, topOrgs });
    } catch (error) {
      next(error);
    }
  }

  static async getChurnAnalysis(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { startDate, endDate } = req.query as Record<string, string>;
      const data = await AnalyticsService.getChurnTrend({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });
      sendSuccess(res, { churnTrend: data });
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

  // ── Admin Subscriptions (direct subscription ID routes) ─────────────────

  // GET /admin/subscriptions
  static async getAdminSubscriptions(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        status, planId, billingCycle, paymentProvider, createdBy,
        search, trialEndingSoon, renewalBefore, renewalAfter, page, limit,
      } = req.query as Record<string, string>;

      const result = await AdminSubscriptionService.listAll({
        status: status as SubscriptionStatus,
        planId,
        billingCycle: billingCycle as BillingCycle,
        paymentProvider: paymentProvider as PaymentProvider,
        createdBy: createdBy as SubscriptionCreatedBy,
        search,
        trialEndingSoon: trialEndingSoon === 'true',
        renewalBefore: renewalBefore ? new Date(renewalBefore) : undefined,
        renewalAfter: renewalAfter ? new Date(renewalAfter) : undefined,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });

      sendPaginated(
        res,
        result.data,
        result.pagination.total,
        result.pagination.page,
        result.pagination.limit,
        'Subscriptions fetched successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  // GET /admin/subscriptions/kpis
  static async getSubscriptionKpis(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const kpis = await AdminSubscriptionService.getKpiCounts();
      sendSuccess(res, { kpis });
    } catch (error) {
      next(error);
    }
  }

  // GET /admin/subscriptions/:subscriptionId
  static async getAdminSubscription(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const subscription = await AdminSubscriptionService.getById(req.params.subscriptionId);
      sendSuccess(res, { subscription });
    } catch (error) {
      next(error);
    }
  }

  // GET /admin/subscriptions/:subscriptionId/history
  static async getAdminSubscriptionHistory(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const history = await AdminSubscriptionService.getHistory(req.params.subscriptionId);
      sendSuccess(res, { history });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /admin/subscriptions/:subscriptionId/change-plan
  static async adminChangePlan(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { newPlanId, billingCycle, reason } = req.body;
      const subscription = await AdminSubscriptionService.changePlan({
        subscriptionId: req.params.subscriptionId,
        newPlanId,
        billingCycle,
        reason,
        adminId: req.user!.userId,
      });
      sendSuccess(res, { subscription }, 'Plan changed successfully');
    } catch (error) {
      next(error);
    }
  }

  // PATCH /admin/subscriptions/:subscriptionId/extend-trial
  static async adminExtendTrial(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { additionalDays, reason } = req.body;
      const subscription = await AdminSubscriptionService.extendTrial({
        subscriptionId: req.params.subscriptionId,
        additionalDays,
        reason,
        adminId: req.user!.userId,
      });
      sendSuccess(res, { subscription }, 'Trial extended successfully');
    } catch (error) {
      next(error);
    }
  }

  // PATCH /admin/subscriptions/:subscriptionId/cancel
  static async adminCancelSubscription(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { reason } = req.body;
      const subscription = await AdminSubscriptionService.cancel({
        subscriptionId: req.params.subscriptionId,
        reason,
        adminId: req.user!.userId,
      });
      sendSuccess(res, { subscription }, 'Subscription cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  // PATCH /admin/subscriptions/:subscriptionId/reactivate
  static async adminReactivateSubscription(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { planId, billingCycle, reason } = req.body;
      const subscription = await AdminSubscriptionService.reactivate({
        subscriptionId: req.params.subscriptionId,
        planId,
        billingCycle,
        reason,
        adminId: req.user!.userId,
      });
      sendSuccess(res, { subscription }, 'Subscription reactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  // PATCH /admin/subscriptions/:subscriptionId/force-expire
  static async adminForceExpire(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { reason } = req.body;
      const subscription = await AdminSubscriptionService.forceExpire({
        subscriptionId: req.params.subscriptionId,
        reason,
        adminId: req.user!.userId,
      });
      sendSuccess(res, { subscription }, 'Subscription force-expired');
    } catch (error) {
      next(error);
    }
  }
}
