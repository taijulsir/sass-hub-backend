import { Organization, IOrganizationDocument } from '../organization/organization.model';
import { User, IUserDocument } from '../user/user.model';
import { Subscription } from '../subscription/subscription.model';
import { SubscriptionHistory } from '../subscription/subscription-history.model';
import { Membership } from '../membership/membership.model';
import { Plan as PlanModel, IPlanDocument } from './plan.model';
import { ApiError } from '../../utils/api-error';
import { OrgStatus, Plan, AuditAction, GlobalRole } from '../../types/enums';
import { PaginatedResponse } from '../../types/interfaces';
import { parsePagination } from '../../utils/response';
import { AuditService } from '../audit/audit.service';
import { CreatePlanDto } from './admin.dto';

export interface AdminOrgQueryParams {
  status?: OrgStatus;
  plan?: Plan;
  search?: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
}

export class AdminService {
  // Get all organizations
  static async getOrganizations(
    params: AdminOrgQueryParams
  ): Promise<PaginatedResponse<IOrganizationDocument>> {
    const { page, limit, skip } = parsePagination({
      page: params.page?.toString(),
      limit: params.limit?.toString(),
    });

    // Build filter
    const filter: Record<string, unknown> = {
      isActive: params.isActive !== undefined ? params.isActive : true,
    };

    if (params.status) {
      filter.status = params.status;
    }

    if (params.plan) {
      filter.plan = params.plan;
    }

    if (params.search) {
      filter.$or = [
        { name: { $regex: params.search, $options: 'i' } },
        { slug: { $regex: params.search, $options: 'i' } },
      ];
    }

    // Get total count
    const total = await Organization.countDocuments(filter);

    // Get organizations
    const organizations = await Organization.find(filter)
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    return {
      data: organizations,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // Get organization by ID with details
  static async getOrganizationDetails(organizationId: string) {
    const organization = await Organization.findById(organizationId)
      .populate('ownerId', 'name email');

    if (!organization) {
      throw ApiError.notFound('Organization not found');
    }

    const subscription = await Subscription.findOne({ organizationId });
    const memberCount = await Membership.countDocuments({ organizationId });

    return {
      organization,
      subscription,
      memberCount,
    };
  }

  // Change organization status
  static async changeOrgStatus(
    organizationId: string,
    status: OrgStatus,
    adminId: string,
    reason?: string
  ): Promise<IOrganizationDocument> {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw ApiError.notFound('Organization not found');
    }

    const oldStatus = organization.status;
    organization.status = status;
    await organization.save();

    // Audit log
    const action = status === OrgStatus.ACTIVE 
      ? AuditAction.ORG_ACTIVATED 
      : AuditAction.ORG_SUSPENDED;

    await AuditService.log({
      organizationId,
      userId: adminId,
      action,
      resource: 'Organization',
      resourceId: organizationId,
      metadata: { oldStatus, newStatus: status, reason, byAdmin: true },
    });

    return organization;
  }

  // Change organization plan (admin override)
  static async changeOrgPlan(
    organizationId: string,
    newPlan: Plan,
    adminId: string,
    reason?: string
  ): Promise<IOrganizationDocument> {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw ApiError.notFound('Organization not found');
    }

    const subscription = await Subscription.findOne({ organizationId });
    if (!subscription) {
      throw ApiError.notFound('Subscription not found');
    }

    const oldPlan = organization.plan;

    // Create history record
    await SubscriptionHistory.create({
      organizationId,
      oldPlan,
      newPlan,
      changedBy: adminId,
      reason: reason || 'Admin override',
      changedAt: new Date(),
    });

    // Update subscription
    subscription.currentPlan = newPlan;
    await subscription.save();

    // Update organization
    organization.plan = newPlan;
    await organization.save();

    // Audit log
    await AuditService.log({
      organizationId,
      userId: adminId,
      action: AuditAction.PLAN_CHANGED,
      resource: 'Subscription',
      metadata: { oldPlan, newPlan, reason, byAdmin: true },
    });

    return organization;
  }

  // Create organization
  static async createOrganization(data: any, adminId: string): Promise<IOrganizationDocument> {
    const slug = data.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    const organization = await Organization.create({
      ...data,
      slug,
      ownerId: adminId, // Defaulting owner to the creating admin for now
      status: OrgStatus.ACTIVE,
      isActive: true,
    });

    // Create default subscription
    await Subscription.create({
      organizationId: organization._id,
      plan: Plan.FREE,
      status: 'active',
      startDate: new Date(),
    });

    await AuditService.log({
      organizationId: organization._id.toString(),
      userId: adminId,
      action: AuditAction.ORG_CREATED,
      resource: 'Organization',
      resourceId: organization._id.toString(),
      metadata: { byAdmin: true },
    });

    return organization;
  }

  // Get all users
  static async getUsers(params: { page?: number; limit?: number; search?: string; isActive?: boolean }) {
    const { page, limit, skip } = parsePagination({
      page: params.page?.toString(),
      limit: params.limit?.toString(),
    });

    const filter: Record<string, unknown> = {
      isActive: params.isActive !== undefined ? params.isActive : true,
    };

    if (params.search) {
      filter.$or = [
        { name: { $regex: params.search, $options: 'i' } },
        { email: { $regex: params.search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(filter);

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // Create user
  static async createUser(data: any, adminId: string): Promise<IUserDocument> {
    const user = await User.create({
      ...data,
      password: 'DefaultPassword123!', // Admin created users should have a way to reset
      globalRole: data.globalRole || GlobalRole.USER,
      isActive: true,
    });

    await AuditService.log({
      userId: adminId,
      action: AuditAction.USER_CREATED,
      resource: 'User',
      resourceId: user._id.toString(),
      metadata: { createdUserId: user._id, byAdmin: true },
    });

    return user;
  }

  // Get dashboard statistics
  static async getDashboardStats() {
    const [
      totalOrganizations,
      activeOrganizations,
      suspendedOrganizations,
      totalUsers,
      freeOrgs,
      proOrgs,
      enterpriseOrgs,
    ] = await Promise.all([
      Organization.countDocuments({ isActive: true }),
      Organization.countDocuments({ status: OrgStatus.ACTIVE, isActive: true }),
      Organization.countDocuments({ status: OrgStatus.SUSPENDED, isActive: true }),
      User.countDocuments({ isActive: true }),
      Organization.countDocuments({ plan: Plan.FREE, isActive: true }),
      Organization.countDocuments({ plan: Plan.PRO, isActive: true }),
      Organization.countDocuments({ plan: Plan.ENTERPRISE, isActive: true }),
    ]);

    return {
      organizations: {
        total: totalOrganizations,
        active: activeOrganizations,
        suspended: suspendedOrganizations,
      },
      users: {
        total: totalUsers,
      },
      subscriptions: {
        free: freeOrgs,
        pro: proOrgs,
        enterprise: enterpriseOrgs,
      },
    };
  }

  // Create plan
  static async createPlan(dto: CreatePlanDto): Promise<IPlanDocument> {
    const existingPlan = await PlanModel.findOne({ name: dto.name });
    if (existingPlan) {
      throw ApiError.conflict('Plan with this name already exists');
    }

    return PlanModel.create(dto);
  }

  // Get all plans
  static async getPlans(): Promise<IPlanDocument[]> {
    return PlanModel.find({ isActive: true }).sort({ price: 1 });
  }

  // Get users by global role
  static async getSuperAdmins(): Promise<IUserDocument[]> {
    return User.find({ globalRole: GlobalRole.SUPER_ADMIN });
  }

  // Get audit logs
  static async getAuditLogs(params: { page?: number; limit?: number }) {
    // Admin sees all logs (no organization filter)
    return AuditService.getLogs({
      page: params.page,
      limit: params.limit,
    });
  }

  // Get analytics
  static async getAnalytics(params: { startDate?: Date; endDate?: Date }) {
    const start = params.startDate || new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = params.endDate || new Date();

    // Example aggregations
    // 1. User growth
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, isActive: true } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 2. Organization growth
    const orgGrowth = await Organization.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, isActive: true } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 3. Revenue simplified (from subscriptions)
    const activeSubscriptions = await Subscription.countDocuments({ isActive: true });

    return {
      userGrowth,
      orgGrowth,
      activeSubscriptions,
      period: { start, end }
    };
  }

  // Get system settings (Mocked for now)
  static async getSettings() {
    // In a real app, fetch from a Settings model
    return {
      registrationEnabled: true,
      maintenanceMode: false,
      defaultTrialDays: 14,
      supportEmail: 'support@example.com'
    };
  }

  // Update system settings (Mocked)
  static async updateSettings(settings: any) {
    // In a real app, update Settings model
    return settings;
  }

  // Archive organization (soft delete)
  static async archiveOrganization(organizationId: string, adminId: string): Promise<IOrganizationDocument> {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw ApiError.notFound('Organization not found');
    }

    organization.isActive = false;
    await organization.save();

    // Audit log
    await AuditService.log({
      organizationId,
      userId: adminId,
      action: AuditAction.ORG_DELETED, // Reusing existing action for soft delete
      resource: 'Organization',
      resourceId: organizationId,
      metadata: { archived: true, byAdmin: true },
    });

    return organization;
  }

  // Archive user (soft delete)
  static async archiveUser(userId: string, adminId: string): Promise<IUserDocument> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    user.isActive = false;
    await user.save();

    // Audit log
    await AuditService.log({
      userId: adminId,
      action: AuditAction.USER_DELETED, // Reusing existing action for soft delete
      resource: 'User',
      resourceId: userId,
      metadata: { archived: true, byAdmin: true },
    });

    return user;
  }

  // Archive subscription
  static async archiveSubscription(subscriptionId: string, adminId: string): Promise<void> {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw ApiError.notFound('Subscription not found');
    }

    subscription.isActive = false;
    await subscription.save();

    // Audit log
    await AuditService.log({
      organizationId: subscription.organizationId.toString(),
      userId: adminId,
      action: AuditAction.PLAN_CHANGED, // Or define a new one if needed
      resource: 'Subscription',
      resourceId: subscriptionId,
      metadata: { archived: true, byAdmin: true },
    });
  }

  // Update organization details
  static async updateOrganization(
    organizationId: string,
    data: { name?: string; status?: OrgStatus; plan?: Plan },
    adminId: string
  ): Promise<IOrganizationDocument> {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw ApiError.notFound('Organization not found');
    }

    if (data.name) organization.name = data.name;
    if (data.status) organization.status = data.status;
    if (data.plan) organization.plan = data.plan;

    await organization.save();

    // Audit log
    await AuditService.log({
      organizationId,
      userId: adminId,
      action: AuditAction.ORG_UPDATED,
      resource: 'Organization',
      resourceId: organizationId,
      metadata: { ...data, byAdmin: true },
    });

    return organization;
  }

  // Update user details
  static async updateUser(
    userId: string,
    data: { name?: string },
    adminId: string
  ): Promise<IUserDocument> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (data.name) user.name = data.name;

    await user.save();

    // Audit log
    await AuditService.log({
      userId: adminId,
      action: AuditAction.USER_UPDATED,
      resource: 'User',
      resourceId: userId,
      metadata: { ...data, byAdmin: true },
    });

    return user;
  }
}
