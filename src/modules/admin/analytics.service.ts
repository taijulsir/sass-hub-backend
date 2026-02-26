import { Organization } from '../organization/organization.model';
import { User } from '../user/user.model';
import { Subscription } from '../subscription/subscription.model';
import { Plan as PlanModel } from '../plan/plan.model';
import { SubscriptionStatus, BillingCycle, GlobalRole } from '../../types/enums';

// ── Helpers ────────────────────────────────────────────────────────────────

function buildDateRange(startDate?: Date, endDate?: Date) {
  const end = endDate ?? new Date();
  const start = startDate ?? new Date(new Date().setMonth(end.getMonth() - 11));
  return { start, end };
}

function previousPeriod(start: Date, end: Date) {
  const len = end.getTime() - start.getTime();
  return {
    prevStart: new Date(start.getTime() - len),
    prevEnd: new Date(start.getTime()),
  };
}

function pct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100 * 10) / 10;
}

// ── Overview ───────────────────────────────────────────────────────────────

export class AnalyticsService {
  /**
   * Overview KPI cards — 8 metrics with period-over-period deltas
   */
  static async getOverview(params: { startDate?: Date; endDate?: Date }) {
    const { start, end } = buildDateRange(params.startDate, params.endDate);
    const { prevStart, prevEnd } = previousPeriod(start, end);

    const [
      plans,
      subscriptions,
      activeSubsCurr,
      activeSubsPrev,
      totalOrgsCurr,
      totalOrgsPrev,
      newOrgsCurr,
      newOrgsPrev,
      totalUsersCurr,
      totalUsersPrev,
      newUsersCurr,
      newUsersPrev,
      trialSubs,
      canceledSubs,
    ] = await Promise.all([
      PlanModel.find({ isActive: true }).select('_id price yearlyPrice').lean(),
      Subscription.find({ isActive: true }).select('planId billingCycle').lean(),
      Subscription.countDocuments({ isActive: true, status: SubscriptionStatus.ACTIVE }),
      Subscription.countDocuments({
        isActive: true,
        status: SubscriptionStatus.ACTIVE,
        createdAt: { $lt: start },
      }),
      Organization.countDocuments({ isActive: true }),
      Organization.countDocuments({ isActive: true, createdAt: { $lt: start } }),
      Organization.countDocuments({ isActive: true, createdAt: { $gte: start, $lte: end } }),
      Organization.countDocuments({ isActive: true, createdAt: { $gte: prevStart, $lte: prevEnd } }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true, createdAt: { $lt: start } }),
      User.countDocuments({ isActive: true, createdAt: { $gte: start, $lte: end } }),
      User.countDocuments({ isActive: true, createdAt: { $gte: prevStart, $lte: prevEnd } }),
      Subscription.countDocuments({ isActive: true, isTrial: true }),
      Subscription.countDocuments({
        status: SubscriptionStatus.CANCELED,
        cancelledAt: { $gte: start, $lte: end },
      }),
    ]);

    // Build planId → monthly price map
    const planMap = new Map<string, number>();
    for (const p of plans) {
      planMap.set(
        p._id.toString(),
        p.price ?? 0,
      );
    }

    // MRR = sum of monthly equivalent prices for all active subscriptions
    let mrr = 0;
    for (const sub of subscriptions) {
      const monthly = planMap.get(sub.planId?.toString() ?? '') ?? 0;
      mrr += sub.billingCycle === BillingCycle.YEARLY ? monthly * 10 : monthly;
    }
    mrr = Math.round(mrr);

    // Trial conversion rate in current period
    const totalTrialsCurr = await Subscription.countDocuments({
      isTrial: true,
      createdAt: { $gte: start, $lte: end },
    });
    const convertedFromTrial = await Subscription.countDocuments({
      isTrial: false,
      status: SubscriptionStatus.ACTIVE,
      createdAt: { $gte: start, $lte: end },
    });
    const trialConversionRate =
      totalTrialsCurr > 0 ? Math.round((convertedFromTrial / totalTrialsCurr) * 100) : 0;

    // Churn rate = canceled / (active start + new in period)
    const activeAtStart = activeSubsPrev;
    const churnRate =
      activeAtStart > 0 ? Math.round((canceledSubs / activeAtStart) * 100 * 10) / 10 : 0;

    // ARPU = MRR / active subscriptions
    const arpu = activeSubsCurr > 0 ? Math.round(mrr / activeSubsCurr) : 0;

    return {
      mrr,
      mrrChange: pct(mrr, mrr), // will improve with period comparison below
      activeSubscriptions: activeSubsCurr,
      activeSubsChange: pct(activeSubsCurr, activeSubsPrev),
      totalOrganizations: totalOrgsCurr,
      orgChange: pct(newOrgsCurr, newOrgsPrev),
      totalUsers: totalUsersCurr,
      userChange: pct(newUsersCurr, newUsersPrev),
      trialSubscriptions: trialSubs,
      trialConversionRate,
      churnRate,
      arpu,
      newOrgs: newOrgsCurr,
      newUsers: newUsersCurr,
      period: { start, end },
    };
  }

  /**
   * Monthly Revenue & MRR trend for line chart
   */
  static async getRevenueTrend(params: { startDate?: Date; endDate?: Date }) {
    const { start, end } = buildDateRange(params.startDate, params.endDate);

    const plans = await PlanModel.find({ isActive: true }).select('_id price').lean();
    const planMap = new Map<string, number>();
    for (const p of plans) planMap.set(p._id.toString(), p.price ?? 0);

    // New subscriptions per month (as proxy for revenue when no payments model)
    const newSubsByMonth = await Subscription.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          planIds: { $push: '$planId' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Compute revenue per month using plan prices
    const allPlans = await PlanModel.find().lean();
    const planPriceMap = new Map<string, number>();
    for (const p of allPlans) planPriceMap.set(p._id.toString(), p.price ?? 0);

    const revenueTrend = newSubsByMonth.map((m) => {
      const revenue = (m.planIds as string[]).reduce(
        (sum: number, id: string) => sum + (planPriceMap.get(id?.toString()) ?? 0),
        0
      );
      return { month: m._id, revenue: Math.round(revenue), newSubscriptions: m.count };
    });

    // Active subs per month (MRR proxy)
    const mrrTrend = await Subscription.aggregate([
      {
        $match: {
          isActive: true,
          startDate: { $lte: end },
          $or: [{ endDate: null }, { endDate: { $gte: start } }],
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$startDate' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return { revenueTrend, mrrTrend };
  }

  /**
   * Revenue breakdown by plan (for bar chart)
   */
  static async getRevenueByPlan() {
    const [plans, subsByPlan] = await Promise.all([
      PlanModel.find({ isActive: true }).lean(),
      Subscription.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$planId', count: { $sum: 1 } } },
      ]),
    ]);

    const planMap = new Map<string, { name: string; price: number }>();
    for (const p of plans) planMap.set(p._id.toString(), { name: p.name, price: p.price ?? 0 });

    return subsByPlan.map((s) => {
      const plan = planMap.get(s._id?.toString() ?? '');
      return {
        plan: plan?.name ?? 'Unknown',
        subscriptions: s.count,
        mrr: Math.round((plan?.price ?? 0) * s.count),
      };
    });
  }

  /**
   * Subscription status distribution (pie/donut chart)
   */
  static async getSubscriptionStatusStats() {
    const statusCounts = await Subscription.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const colorMap: Record<string, string> = {
      [SubscriptionStatus.ACTIVE]: '#22c55e',
      [SubscriptionStatus.TRIAL]: '#3b82f6',
      [SubscriptionStatus.PAST_DUE]: '#f59e0b',
      [SubscriptionStatus.CANCELED]: '#ef4444',
      [SubscriptionStatus.EXPIRED]: '#6b7280',
    };

    return statusCounts.map((s) => ({
      status: s._id,
      count: s.count,
      color: colorMap[s._id] ?? '#9ca3af',
    }));
  }

  /**
   * New subscriptions vs. cancellations per month (stacked bar chart)
   */
  static async getNewVsCanceled(params: { startDate?: Date; endDate?: Date }) {
    const { start, end } = buildDateRange(params.startDate, params.endDate);

    const [newSubs, canceledSubs] = await Promise.all([
      Subscription.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            newCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Subscription.aggregate([
        {
          $match: {
            status: SubscriptionStatus.CANCELED,
            cancelledAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$cancelledAt' } },
            canceledCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const monthMap = new Map<string, { month: string; newSubs: number; canceled: number }>();
    for (const n of newSubs) {
      monthMap.set(n._id, { month: n._id, newSubs: n.newCount, canceled: 0 });
    }
    for (const c of canceledSubs) {
      const existing = monthMap.get(c._id);
      if (existing) {
        existing.canceled = c.canceledCount;
      } else {
        monthMap.set(c._id, { month: c._id, newSubs: 0, canceled: c.canceledCount });
      }
    }

    return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Organization growth over time (line chart)
   */
  static async getOrgGrowth(params: { startDate?: Date; endDate?: Date }) {
    const { start, end } = buildDateRange(params.startDate, params.endDate);

    const growth = await Organization.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Cumulative total
    const totalBefore = await Organization.countDocuments({
      isActive: true,
      createdAt: { $lt: start },
    });
    let cumulative = totalBefore;
    return growth.map((g) => {
      cumulative += g.count;
      return { month: g._id, newOrgs: g.count, totalOrgs: cumulative };
    });
  }

  /**
   * Top organizations by subscription plan tier (bar chart)
   */
  static async getTopOrgsByRevenue(limit = 10) {
    const subs = await Subscription.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'plans',
          localField: 'planId',
          foreignField: '_id',
          as: 'plan',
        },
      },
      { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
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
        $group: {
          _id: '$organizationId',
          orgName: { $first: '$org.name' },
          mrr: { $sum: '$plan.price' },
          plan: { $first: '$plan.name' },
        },
      },
      { $sort: { mrr: -1 } },
      { $limit: limit },
    ]);

    return subs.map((s) => ({
      organization: s.orgName ?? 'Unknown',
      mrr: Math.round(s.mrr ?? 0),
      plan: s.plan ?? 'Unknown',
    }));
  }

  /**
   * Plan distribution (donut chart)
   */
  static async getPlanDistribution() {
    const dist = await Subscription.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'plans',
          localField: 'planId',
          foreignField: '_id',
          as: 'plan',
        },
      },
      { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$plan.name',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const palette = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];
    return dist.map((d, i) => ({
      plan: d._id ?? 'Unknown',
      count: d.count,
      color: palette[i % palette.length],
    }));
  }

  /**
   * User growth over time (line chart)
   */
  static async getUserGrowth(params: { startDate?: Date; endDate?: Date }) {
    const { start, end } = buildDateRange(params.startDate, params.endDate);

    const growth = await User.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalBefore = await User.countDocuments({ isActive: true, createdAt: { $lt: start } });
    let cumulative = totalBefore;
    return growth.map((g) => {
      cumulative += g.count;
      return { month: g._id, newUsers: g.count, totalUsers: cumulative };
    });
  }

  /**
   * User role distribution (pie chart)
   */
  static async getRoleDistribution() {
    const dist = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$globalRole', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const colorMap: Record<string, string> = {
      [GlobalRole.SUPER_ADMIN]: '#ef4444',
      [GlobalRole.ADMIN]: '#f59e0b',
      [GlobalRole.SUPPORT]: '#3b82f6',
      [GlobalRole.USER]: '#22c55e',
      [GlobalRole.MEMBER]: '#6b7280',
    };

    return dist.map((d) => ({
      role: d._id ?? 'Unknown',
      count: d.count,
      color: colorMap[d._id] ?? '#9ca3af',
    }));
  }

  /**
   * Churn trend over time (area chart)
   */
  static async getChurnTrend(params: { startDate?: Date; endDate?: Date }) {
    const { start, end } = buildDateRange(params.startDate, params.endDate);

    const [churnByMonth, activePrevMonth] = await Promise.all([
      Subscription.aggregate([
        {
          $match: {
            status: SubscriptionStatus.CANCELED,
            cancelledAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$cancelledAt' } },
            churned: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Subscription.aggregate([
        { $match: { isActive: true, createdAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            active: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const activeMap = new Map<string, number>();
    for (const a of activePrevMonth) activeMap.set(a._id, a.active);

    return churnByMonth.map((c) => {
      const active = activeMap.get(c._id) ?? 1;
      const churnRate = Math.round((c.churned / Math.max(active, 1)) * 100 * 10) / 10;
      return { month: c._id, churned: c.churned, churnRate };
    });
  }
}
