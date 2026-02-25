import { Subscription, ISubscriptionDocument } from './subscription.model';
import { SubscriptionHistory, ISubscriptionHistoryDocument } from './subscription-history.model';
import { Plan as PlanModel } from '../plan/plan.model';
import { ApiError } from '../../utils/api-error';
import {
  SubscriptionStatus,
  SubscriptionChangeType,
  SubscriptionCreatedBy,
  PaymentProvider,
  BillingCycle,
  AuditAction,
} from '../../types/enums';
import { AuditService } from '../audit/audit.service';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Plan sort-order lookup (higher = more expensive) */
const PLAN_TIER: Record<string, number> = { FREE: 0, STARTER: 1, PRO: 2, ENTERPRISE: 3 };

function getChangeType(oldPlanName: string, newPlanName: string): SubscriptionChangeType {
  const oldTier = PLAN_TIER[oldPlanName] ?? 0;
  const newTier = PLAN_TIER[newPlanName] ?? 0;
  return newTier > oldTier
    ? SubscriptionChangeType.UPGRADE
    : SubscriptionChangeType.DOWNGRADE;
}

function computeRenewalDate(billingCycle: BillingCycle, from: Date = new Date()): Date {
  const d = new Date(from);
  if (billingCycle === BillingCycle.YEARLY) {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

// ── Service ────────────────────────────────────────────────────────────────

export class SubscriptionService {
  /**
   * Get the current active subscription for an organization (with plan populated)
   */
  static async getByOrganization(organizationId: string): Promise<ISubscriptionDocument> {
    const subscription = await Subscription.findOne({ organizationId, isActive: true })
      .populate('planId')
      .lean();
    if (!subscription) throw ApiError.notFound('Subscription not found');
    return subscription as any;
  }

  /**
   * Create a subscription (used by both admin and self-service flows).
   * Deactivates any existing active subscription for the org.
   */
  static async create(params: {
    organizationId: string;
    planId: string;
    billingCycle?: BillingCycle;
    isTrial?: boolean;
    trialDays?: number;
    paymentProvider?: PaymentProvider;
    paymentReferenceId?: string;
    createdBy: SubscriptionCreatedBy;
    userId: string;
  }): Promise<ISubscriptionDocument> {
    const plan = await PlanModel.findById(params.planId);
    if (!plan) throw ApiError.notFound('Plan not found');

    // Deactivate existing active subscriptions
    await Subscription.updateMany(
      { organizationId: params.organizationId, isActive: true },
      { $set: { isActive: false, status: SubscriptionStatus.EXPIRED } }
    );

    const billingCycle = params.billingCycle || BillingCycle.MONTHLY;
    const isTrial = params.isTrial ?? false;
    const now = new Date();

    let trialEndDate: Date | undefined;
    let renewalDate: Date | undefined;
    let status: SubscriptionStatus;

    if (isTrial) {
      const trialDays = params.trialDays || plan.trialDays || 14;
      trialEndDate = new Date(now);
      trialEndDate.setDate(trialEndDate.getDate() + trialDays);
      status = SubscriptionStatus.TRIAL;
      renewalDate = trialEndDate;
    } else {
      status = SubscriptionStatus.ACTIVE;
      renewalDate = computeRenewalDate(billingCycle, now);
    }

    const subscription = await Subscription.create({
      organizationId: params.organizationId,
      planId: params.planId,
      status,
      billingCycle,
      startDate: now,
      renewalDate,
      trialEndDate,
      isTrial,
      paymentProvider: params.paymentProvider || PaymentProvider.NONE,
      paymentReferenceId: params.paymentReferenceId,
      createdBy: params.createdBy,
      isActive: true,
    });

    // History record
    await SubscriptionHistory.create({
      subscriptionId: subscription._id,
      organizationId: params.organizationId,
      newPlanId: params.planId,
      changeType: isTrial ? SubscriptionChangeType.TRIAL_START : SubscriptionChangeType.MANUAL_OVERRIDE,
      changedBy: params.userId,
      reason: `Subscription created (${params.createdBy})`,
    });

    // Audit
    await AuditService.log({
      organizationId: params.organizationId,
      userId: params.userId,
      action: isTrial ? AuditAction.TRIAL_STARTED : AuditAction.SUBSCRIPTION_CREATED,
      resource: 'Subscription',
      resourceId: subscription._id.toString(),
      metadata: { planName: plan.name, billingCycle, isTrial, createdBy: params.createdBy },
    });

    return subscription;
  }

  /**
   * Change plan (upgrade / downgrade)
   */
  static async changePlan(params: {
    organizationId: string;
    newPlanId: string;
    billingCycle?: BillingCycle;
    changedBy: string;
    reason?: string;
  }): Promise<ISubscriptionDocument> {
    const subscription = await Subscription.findOne({
      organizationId: params.organizationId,
      isActive: true,
    });
    if (!subscription) throw ApiError.notFound('Active subscription not found');

    const newPlan = await PlanModel.findById(params.newPlanId);
    if (!newPlan) throw ApiError.notFound('Plan not found');

    const oldPlan = await PlanModel.findById(subscription.planId);
    const oldPlanId = subscription.planId;

    if (subscription.planId.toString() === params.newPlanId) {
      throw ApiError.badRequest('Already on this plan');
    }

    const changeType = getChangeType(oldPlan?.name || 'FREE', newPlan.name);
    const billingCycle = params.billingCycle || (subscription.billingCycle as BillingCycle);

    subscription.planId = newPlan._id as any;
    subscription.billingCycle = billingCycle;
    subscription.renewalDate = computeRenewalDate(billingCycle);
    if (subscription.isTrial) {
      subscription.isTrial = false;
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.trialEndDate = undefined;
    }
    await subscription.save();

    // History
    await SubscriptionHistory.create({
      subscriptionId: subscription._id,
      organizationId: params.organizationId,
      previousPlanId: oldPlanId,
      newPlanId: params.newPlanId,
      changeType,
      changedBy: params.changedBy,
      reason: params.reason,
    });

    const auditAction = changeType === SubscriptionChangeType.UPGRADE
      ? AuditAction.SUBSCRIPTION_UPGRADED
      : AuditAction.SUBSCRIPTION_DOWNGRADED;

    await AuditService.log({
      organizationId: params.organizationId,
      userId: params.changedBy,
      action: auditAction,
      resource: 'Subscription',
      resourceId: subscription._id.toString(),
      metadata: { oldPlan: oldPlan?.name, newPlan: newPlan.name, reason: params.reason },
    });

    return subscription;
  }

  /**
   * Cancel subscription
   */
  static async cancel(params: {
    organizationId: string;
    cancelledBy: string;
    reason?: string;
  }): Promise<ISubscriptionDocument> {
    const subscription = await Subscription.findOne({
      organizationId: params.organizationId,
      isActive: true,
    });
    if (!subscription) throw ApiError.notFound('Active subscription not found');

    if (subscription.status === SubscriptionStatus.CANCELED) {
      throw ApiError.badRequest('Subscription is already cancelled');
    }

    const oldPlanId = subscription.planId;

    subscription.status = SubscriptionStatus.CANCELED;
    subscription.cancelledAt = new Date();
    subscription.cancelReason = params.reason;
    subscription.isActive = false;
    await subscription.save();

    await SubscriptionHistory.create({
      subscriptionId: subscription._id,
      organizationId: params.organizationId,
      previousPlanId: oldPlanId,
      changeType: SubscriptionChangeType.CANCEL,
      changedBy: params.cancelledBy,
      reason: params.reason || 'Subscription cancelled',
    });

    await AuditService.log({
      organizationId: params.organizationId,
      userId: params.cancelledBy,
      action: AuditAction.SUBSCRIPTION_CANCELLED,
      resource: 'Subscription',
      resourceId: subscription._id.toString(),
      metadata: { reason: params.reason },
    });

    return subscription;
  }

  /**
   * Reactivate a cancelled/expired subscription
   */
  static async reactivate(params: {
    organizationId: string;
    planId: string;
    billingCycle?: BillingCycle;
    reactivatedBy: string;
  }): Promise<ISubscriptionDocument> {
    const plan = await PlanModel.findById(params.planId);
    if (!plan) throw ApiError.notFound('Plan not found');

    // Deactivate any existing
    await Subscription.updateMany(
      { organizationId: params.organizationId, isActive: true },
      { $set: { isActive: false } }
    );

    const billingCycle = params.billingCycle || BillingCycle.MONTHLY;

    const subscription = await Subscription.create({
      organizationId: params.organizationId,
      planId: params.planId,
      status: SubscriptionStatus.ACTIVE,
      billingCycle,
      startDate: new Date(),
      renewalDate: computeRenewalDate(billingCycle),
      isTrial: false,
      paymentProvider: PaymentProvider.MANUAL,
      createdBy: SubscriptionCreatedBy.ADMIN,
      isActive: true,
    });

    await SubscriptionHistory.create({
      subscriptionId: subscription._id,
      organizationId: params.organizationId,
      newPlanId: params.planId,
      changeType: SubscriptionChangeType.REACTIVATION,
      changedBy: params.reactivatedBy,
      reason: 'Subscription reactivated',
    });

    await AuditService.log({
      organizationId: params.organizationId,
      userId: params.reactivatedBy,
      action: AuditAction.SUBSCRIPTION_REACTIVATED,
      resource: 'Subscription',
      resourceId: subscription._id.toString(),
      metadata: { planName: plan.name },
    });

    return subscription;
  }

  /**
   * Extend trial period
   */
  static async extendTrial(params: {
    organizationId: string;
    additionalDays: number;
    extendedBy: string;
    reason?: string;
  }): Promise<ISubscriptionDocument> {
    const subscription = await Subscription.findOne({
      organizationId: params.organizationId,
      isActive: true,
      isTrial: true,
    });
    if (!subscription) throw ApiError.notFound('No active trial subscription found');

    const oldTrialEnd = subscription.trialEndDate;
    const newTrialEnd = new Date(subscription.trialEndDate || new Date());
    newTrialEnd.setDate(newTrialEnd.getDate() + params.additionalDays);

    subscription.trialEndDate = newTrialEnd;
    subscription.renewalDate = newTrialEnd;
    await subscription.save();

    await SubscriptionHistory.create({
      subscriptionId: subscription._id,
      organizationId: params.organizationId,
      changeType: SubscriptionChangeType.TRIAL_EXTEND,
      changedBy: params.extendedBy,
      reason: params.reason || `Trial extended by ${params.additionalDays} days`,
      metadata: { oldTrialEnd, newTrialEnd, additionalDays: params.additionalDays },
    });

    await AuditService.log({
      organizationId: params.organizationId,
      userId: params.extendedBy,
      action: AuditAction.TRIAL_EXTENDED,
      resource: 'Subscription',
      resourceId: subscription._id.toString(),
      metadata: { additionalDays: params.additionalDays, newTrialEnd },
    });

    return subscription;
  }

  /**
   * Get subscription history for an organization
   */
  static async getHistory(organizationId: string): Promise<ISubscriptionHistoryDocument[]> {
    return SubscriptionHistory.find({ organizationId })
      .populate('previousPlanId', 'name price')
      .populate('newPlanId', 'name price')
      .populate('changedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean() as any;
  }

  /**
   * Get subscription with populated plan details
   */
  static async getWithPlan(organizationId: string) {
    return Subscription.findOne({ organizationId, isActive: true })
      .populate('planId')
      .lean();
  }
}
