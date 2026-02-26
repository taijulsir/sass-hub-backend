import { Subscription } from '../subscription/subscription.model';
import { SubscriptionHistory } from '../subscription/subscription-history.model';
import { Organization } from '../organization/organization.model';
import { Plan as PlanModel } from '../plan/plan.model';
import { ApiError } from '../../utils/api-error';
import { AuditService } from '../audit/audit.service';
import {
  SubscriptionStatus,
  SubscriptionChangeType,
  SubscriptionCreatedBy,
  PaymentProvider,
  BillingCycle,
  AuditAction,
} from '../../types/enums';
import { parsePagination } from '../../utils/response';

// ── Query params ───────────────────────────────────────────────────────────

export interface AdminSubscriptionQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SubscriptionStatus;
  planId?: string;
  billingCycle?: BillingCycle;
  paymentProvider?: PaymentProvider;
  createdBy?: SubscriptionCreatedBy;
  trialEndingSoon?: boolean;   // trial ends within 3 days
  renewalBefore?: Date;
  renewalAfter?: Date;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function computeRenewalDate(billingCycle: BillingCycle, from: Date = new Date()): Date {
  const d = new Date(from);
  billingCycle === BillingCycle.YEARLY
    ? d.setFullYear(d.getFullYear() + 1)
    : d.setMonth(d.getMonth() + 1);
  return d;
}

const PLAN_TIER: Record<string, number> = { FREE: 0, STARTER: 1, PRO: 2, ENTERPRISE: 3 };

function getChangeType(oldName: string, newName: string): SubscriptionChangeType {
  return (PLAN_TIER[newName] ?? 0) > (PLAN_TIER[oldName] ?? 0)
    ? SubscriptionChangeType.UPGRADE
    : SubscriptionChangeType.DOWNGRADE;
}

// ── Service ────────────────────────────────────────────────────────────────

export class AdminSubscriptionService {
  /**
   * Paginated, filtered list of ALL subscriptions (joined with org + plan)
   */
  static async listAll(params: AdminSubscriptionQueryParams) {
    const { skip, limit } = parsePagination({ page: params.page, limit: params.limit });
    const page = params.page ?? 1;

    // Build Subscription-level match
    const match: Record<string, any> = {};

    if (params.status) match.status = params.status;
    if (params.planId) match.planId = params.planId;
    if (params.billingCycle) match.billingCycle = params.billingCycle;
    if (params.paymentProvider) match.paymentProvider = params.paymentProvider;
    if (params.createdBy) match.createdBy = params.createdBy;

    if (params.trialEndingSoon) {
      const in3Days = new Date();
      in3Days.setDate(in3Days.getDate() + 3);
      match.isTrial = true;
      match.trialEndDate = { $lte: in3Days, $gte: new Date() };
    }

    if (params.renewalBefore || params.renewalAfter) {
      match.renewalDate = {};
      if (params.renewalBefore) match.renewalDate.$lte = params.renewalBefore;
      if (params.renewalAfter) match.renewalDate.$gte = params.renewalAfter;
    }

    const pipeline: any[] = [
      { $match: match },
      // Join org
      {
        $lookup: {
          from: 'organizations',
          localField: 'organizationId',
          foreignField: '_id',
          as: 'org',
        },
      },
      { $unwind: { path: '$org', preserveNullAndEmptyArrays: true } },
      // Join plan
      {
        $lookup: {
          from: 'plans',
          localField: 'planId',
          foreignField: '_id',
          as: 'plan',
        },
      },
      { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
    ];

    // Search filter (org name or org public ID)
    if (params.search) {
      const re = new RegExp(params.search, 'i');
      pipeline.push({
        $match: {
          $or: [
            { 'org.name': { $regex: re } },
            { 'org.organizationId': { $regex: re } },
          ],
        },
      });
    }

    // Count total
    const countPipeline = [...pipeline, { $count: 'total' }];
    const [countResult] = await Subscription.aggregate(countPipeline);
    const total = countResult?.total ?? 0;

    // Data fetch
    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          organizationId: 1,
          status: 1,
          billingCycle: 1,
          renewalDate: 1,
          trialEndDate: 1,
          isTrial: 1,
          paymentProvider: 1,
          paymentReferenceId: 1,
          createdBy: 1,
          cancelledAt: 1,
          cancelReason: 1,
          isActive: 1,
          startDate: 1,
          createdAt: 1,
          updatedAt: 1,
          'org._id': 1,
          'org.name': 1,
          'org.organizationId': 1,
          'org.logo': 1,
          'org.status': 1,
          'plan._id': 1,
          'plan.name': 1,
          'plan.price': 1,
          'plan.yearlyPrice': 1,
          'plan.billingCycle': 1,
        },
      }
    );

    const data = await Subscription.aggregate(pipeline);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Single subscription by subscription _id (not org id)
   */
  static async getById(subscriptionId: string) {
    const [sub] = await Subscription.aggregate([
      { $match: { _id: new (require('mongoose').Types.ObjectId)(subscriptionId) } },
      {
        $lookup: {
          from: 'organizations',
          localField: 'organizationId',
          foreignField: '_id',
          as: 'org',
        },
      },
      { $unwind: { path: '$org', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'plans',
          localField: 'planId',
          foreignField: '_id',
          as: 'plan',
        },
      },
      { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
    ]);

    if (!sub) throw ApiError.notFound('Subscription not found');
    return sub;
  }

  /**
   * Plan history timeline for a subscription
   */
  static async getHistory(subscriptionId: string) {
    return SubscriptionHistory.find({ subscriptionId })
      .populate('previousPlanId', 'name price')
      .populate('newPlanId', 'name price')
      .populate('changedBy', 'name email avatar')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Change plan (admin override)
   */
  static async changePlan(params: {
    subscriptionId: string;
    newPlanId: string;
    billingCycle?: BillingCycle;
    reason: string;
    adminId: string;
  }) {
    const subscription = await Subscription.findById(params.subscriptionId);
    if (!subscription) throw ApiError.notFound('Subscription not found');

    const newPlan = await PlanModel.findById(params.newPlanId);
    if (!newPlan) throw ApiError.notFound('Plan not found');

    const oldPlan = await PlanModel.findById(subscription.planId);
    const oldPlanId = subscription.planId;

    if (subscription.planId.toString() === params.newPlanId) {
      throw ApiError.badRequest('Already on this plan');
    }

    const changeType = getChangeType(oldPlan?.name || 'FREE', newPlan.name);
    const billingCycle = params.billingCycle ?? (subscription.billingCycle as BillingCycle);

    subscription.planId = newPlan._id as any;
    subscription.billingCycle = billingCycle;
    subscription.renewalDate = computeRenewalDate(billingCycle);
    if (subscription.isTrial) {
      subscription.isTrial = false;
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.trialEndDate = undefined;
    }
    // Ensure reactivated if was canceled/expired
    if ([SubscriptionStatus.CANCELED, SubscriptionStatus.EXPIRED].includes(subscription.status as SubscriptionStatus)) {
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.isActive = true;
      subscription.cancelledAt = undefined;
    }
    await subscription.save();

    await SubscriptionHistory.create({
      subscriptionId: subscription._id,
      organizationId: subscription.organizationId,
      previousPlanId: oldPlanId,
      newPlanId: params.newPlanId,
      changeType,
      changedBy: params.adminId,
      reason: params.reason,
      metadata: { adminOverride: true },
    });

    const auditAction = changeType === SubscriptionChangeType.UPGRADE
      ? AuditAction.SUBSCRIPTION_UPGRADED
      : AuditAction.SUBSCRIPTION_DOWNGRADED;

    await AuditService.log({
      organizationId: subscription.organizationId.toString(),
      userId: params.adminId,
      action: auditAction,
      resource: 'Subscription',
      resourceId: subscription._id.toString(),
      metadata: { oldPlan: oldPlan?.name, newPlan: newPlan.name, reason: params.reason, adminOverride: true },
    });

    return subscription;
  }

  /**
   * Extend trial period
   */
  static async extendTrial(params: {
    subscriptionId: string;
    additionalDays: number;
    reason?: string;
    adminId: string;
  }) {
    const subscription = await Subscription.findById(params.subscriptionId);
    if (!subscription) throw ApiError.notFound('Subscription not found');
    if (!subscription.isTrial) throw ApiError.badRequest('Subscription is not in trial');

    const oldTrialEnd = subscription.trialEndDate;
    const base = subscription.trialEndDate && subscription.trialEndDate > new Date()
      ? subscription.trialEndDate
      : new Date();
    const newTrialEnd = new Date(base);
    newTrialEnd.setDate(newTrialEnd.getDate() + params.additionalDays);

    subscription.trialEndDate = newTrialEnd;
    subscription.renewalDate = newTrialEnd;
    await subscription.save();

    await SubscriptionHistory.create({
      subscriptionId: subscription._id,
      organizationId: subscription.organizationId,
      changeType: SubscriptionChangeType.TRIAL_EXTEND,
      changedBy: params.adminId,
      reason: params.reason || `Trial extended by ${params.additionalDays} days`,
      metadata: { oldTrialEnd, newTrialEnd, additionalDays: params.additionalDays },
    });

    await AuditService.log({
      organizationId: subscription.organizationId.toString(),
      userId: params.adminId,
      action: AuditAction.TRIAL_EXTENDED,
      resource: 'Subscription',
      resourceId: subscription._id.toString(),
      metadata: { additionalDays: params.additionalDays, newTrialEnd },
    });

    return subscription;
  }

  /**
   * Cancel subscription
   */
  static async cancel(params: {
    subscriptionId: string;
    reason: string;
    adminId: string;
  }) {
    const subscription = await Subscription.findById(params.subscriptionId);
    if (!subscription) throw ApiError.notFound('Subscription not found');
    if (subscription.status === SubscriptionStatus.CANCELED) {
      throw ApiError.badRequest('Subscription is already cancelled');
    }

    subscription.status = SubscriptionStatus.CANCELED;
    subscription.cancelledAt = new Date();
    subscription.cancelReason = params.reason;
    subscription.isActive = false;
    await subscription.save();

    await SubscriptionHistory.create({
      subscriptionId: subscription._id,
      organizationId: subscription.organizationId,
      previousPlanId: subscription.planId,
      changeType: SubscriptionChangeType.CANCEL,
      changedBy: params.adminId,
      reason: params.reason,
      metadata: { adminOverride: true },
    });

    await AuditService.log({
      organizationId: subscription.organizationId.toString(),
      userId: params.adminId,
      action: AuditAction.SUBSCRIPTION_CANCELLED,
      resource: 'Subscription',
      resourceId: subscription._id.toString(),
      metadata: { reason: params.reason, adminOverride: true },
    });

    return subscription;
  }

  /**
   * Reactivate a cancelled/expired subscription
   */
  static async reactivate(params: {
    subscriptionId: string;
    planId: string;
    billingCycle?: BillingCycle;
    adminId: string;
    reason?: string;
  }) {
    const subscription = await Subscription.findById(params.subscriptionId);
    if (!subscription) throw ApiError.notFound('Subscription not found');

    const plan = await PlanModel.findById(params.planId);
    if (!plan) throw ApiError.notFound('Plan not found');

    const billingCycle = params.billingCycle ?? BillingCycle.MONTHLY;

    subscription.planId = plan._id as any;
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.billingCycle = billingCycle;
    subscription.isActive = true;
    subscription.isTrial = false;
    subscription.renewalDate = computeRenewalDate(billingCycle);
    subscription.cancelledAt = undefined;
    subscription.cancelReason = undefined;
    subscription.trialEndDate = undefined;
    await subscription.save();

    await SubscriptionHistory.create({
      subscriptionId: subscription._id,
      organizationId: subscription.organizationId,
      newPlanId: params.planId,
      changeType: SubscriptionChangeType.REACTIVATION,
      changedBy: params.adminId,
      reason: params.reason || 'Reactivated by admin',
      metadata: { adminOverride: true },
    });

    await AuditService.log({
      organizationId: subscription.organizationId.toString(),
      userId: params.adminId,
      action: AuditAction.SUBSCRIPTION_REACTIVATED,
      resource: 'Subscription',
      resourceId: subscription._id.toString(),
      metadata: { planName: plan.name, reason: params.reason },
    });

    return subscription;
  }

  /**
   * Force expire (admin override)
   */
  static async forceExpire(params: {
    subscriptionId: string;
    reason: string;
    adminId: string;
  }) {
    const subscription = await Subscription.findById(params.subscriptionId);
    if (!subscription) throw ApiError.notFound('Subscription not found');

    subscription.status = SubscriptionStatus.EXPIRED;
    subscription.isActive = false;
    subscription.endDate = new Date();
    await subscription.save();

    await SubscriptionHistory.create({
      subscriptionId: subscription._id,
      organizationId: subscription.organizationId,
      changeType: SubscriptionChangeType.MANUAL_OVERRIDE,
      changedBy: params.adminId,
      reason: params.reason,
      metadata: { forceExpired: true },
    });

    await AuditService.log({
      organizationId: subscription.organizationId.toString(),
      userId: params.adminId,
      action: AuditAction.SUBSCRIPTION_EXPIRED,
      resource: 'Subscription',
      resourceId: subscription._id.toString(),
      metadata: { reason: params.reason, adminOverride: true },
    });

    return subscription;
  }

  /**
   * Overview KPI counts for the subscription module header cards
   */
  static async getKpiCounts() {
    const [counts, plans, activeSubs] = await Promise.all([
      Subscription.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      PlanModel.find({ isActive: true }).select('_id price').lean(),
      Subscription.find({ isActive: true, status: SubscriptionStatus.ACTIVE }).select('planId billingCycle').lean(),
    ]);

    const planMap = new Map<string, number>();
    for (const p of plans) planMap.set(p._id.toString(), p.price ?? 0);

    let mrr = 0;
    for (const sub of activeSubs) {
      const monthly = planMap.get(sub.planId?.toString() ?? '') ?? 0;
      mrr += sub.billingCycle === BillingCycle.YEARLY ? monthly * 10 : monthly;
    }

    const byStatus: Record<string, number> = {};
    for (const c of counts) byStatus[c._id] = c.count;

    return {
      active: byStatus[SubscriptionStatus.ACTIVE] ?? 0,
      trial: byStatus[SubscriptionStatus.TRIAL] ?? 0,
      pastDue: byStatus[SubscriptionStatus.PAST_DUE] ?? 0,
      expired: byStatus[SubscriptionStatus.EXPIRED] ?? 0,
      canceled: byStatus[SubscriptionStatus.CANCELED] ?? 0,
      mrr: Math.round(mrr),
    };
  }
}
