import { Subscription, ISubscriptionDocument } from './subscription.model';
import { SubscriptionHistory, ISubscriptionHistoryDocument } from './subscription-history.model';
import { Organization } from '../organization/organization.model';
import { ApiError } from '../../utils/api-error';
import { Plan, AuditAction } from '../../types/enums';
import { AuditService } from '../audit/audit.service';

export class SubscriptionService {
  // Get subscription by organization
  static async getByOrganization(organizationId: string): Promise<ISubscriptionDocument> {
    const subscription = await Subscription.findOne({ organizationId });
    if (!subscription) {
      throw ApiError.notFound('Subscription not found');
    }
    return subscription;
  }

  // Update subscription (change plan)
  static async changePlan(
    organizationId: string,
    newPlan: Plan,
    changedBy: string,
    reason?: string
  ): Promise<ISubscriptionDocument> {
    const subscription = await Subscription.findOne({ organizationId });
    if (!subscription) {
      throw ApiError.notFound('Subscription not found');
    }

    const oldPlan = subscription.currentPlan;
    
    // Don't update if same plan
    if (oldPlan === newPlan) {
      throw ApiError.badRequest('Already on this plan');
    }

    // Create history record
    await SubscriptionHistory.create({
      organizationId,
      oldPlan,
      newPlan,
      changedBy,
      reason,
      changedAt: new Date(),
    });

    // Update subscription
    subscription.currentPlan = newPlan;
    subscription.startDate = new Date();
    await subscription.save();

    // Update organization plan
    await Organization.findByIdAndUpdate(organizationId, { plan: newPlan });

    // Determine action type
    const action = this.getPlanChangeAction(oldPlan, newPlan);

    // Audit log
    await AuditService.log({
      organizationId,
      userId: changedBy,
      action,
      resource: 'Subscription',
      resourceId: subscription._id.toString(),
      metadata: { oldPlan, newPlan, reason },
    });

    return subscription;
  }

  // Cancel subscription
  static async cancel(
    organizationId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<ISubscriptionDocument> {
    const subscription = await Subscription.findOne({ organizationId });
    if (!subscription) {
      throw ApiError.notFound('Subscription not found');
    }

    if (!subscription.isActive) {
      throw ApiError.badRequest('Subscription is already cancelled');
    }

    const oldPlan = subscription.currentPlan;

    // Create history record
    await SubscriptionHistory.create({
      organizationId,
      oldPlan,
      newPlan: Plan.FREE,
      changedBy: cancelledBy,
      reason: reason || 'Subscription cancelled',
      changedAt: new Date(),
    });

    // Update subscription
    subscription.currentPlan = Plan.FREE;
    subscription.cancelledAt = new Date();
    subscription.isActive = false;
    await subscription.save();

    // Update organization plan
    await Organization.findByIdAndUpdate(organizationId, { plan: Plan.FREE });

    // Audit log
    await AuditService.log({
      organizationId,
      userId: cancelledBy,
      action: AuditAction.SUBSCRIPTION_CANCELLED,
      resource: 'Subscription',
      resourceId: subscription._id.toString(),
      metadata: { oldPlan, reason },
    });

    return subscription;
  }

  // Reactivate subscription
  static async reactivate(
    organizationId: string,
    plan: Plan,
    reactivatedBy: string
  ): Promise<ISubscriptionDocument> {
    const subscription = await Subscription.findOne({ organizationId });
    if (!subscription) {
      throw ApiError.notFound('Subscription not found');
    }

    if (subscription.isActive) {
      throw ApiError.badRequest('Subscription is already active');
    }

    subscription.currentPlan = plan;
    subscription.isActive = true;
    subscription.cancelledAt = undefined;
    subscription.startDate = new Date();
    await subscription.save();

    // Update organization plan
    await Organization.findByIdAndUpdate(organizationId, { plan });

    return subscription;
  }

  // Get subscription history
  static async getHistory(organizationId: string): Promise<ISubscriptionHistoryDocument[]> {
    return SubscriptionHistory.find({ organizationId })
      .populate('changedBy', 'name email')
      .sort({ changedAt: -1 });
  }

  // Helper to determine audit action
  private static getPlanChangeAction(oldPlan: string, newPlan: string): AuditAction {
    const planOrder = { [Plan.FREE]: 0, [Plan.PRO]: 1, [Plan.ENTERPRISE]: 2 };
    const oldOrder = planOrder[oldPlan as Plan] ?? 0;
    const newOrder = planOrder[newPlan as Plan] ?? 0;

    if (newOrder > oldOrder) {
      return AuditAction.SUBSCRIPTION_UPGRADED;
    } else {
      return AuditAction.SUBSCRIPTION_DOWNGRADED;
    }
  }
}
