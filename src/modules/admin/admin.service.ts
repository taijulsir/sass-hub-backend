import { Organization, IOrganizationDocument } from '../organization/organization.model';
import { User, IUserDocument } from '../user/user.model';
import { Invitation } from '../invitation/invitation.model';
import { Subscription } from '../subscription/subscription.model';
import { SubscriptionHistory } from '../subscription/subscription-history.model';
import { Membership } from '../membership/membership.model';
import { Plan as PlanModel, IPlanDocument } from './plan.model';
import { ApiError } from '../../utils/api-error';
import { OrgStatus, Plan, AuditAction, GlobalRole, OrgRole, InvitationStatus } from '../../types/enums';
import { PaginatedResponse } from '../../types/interfaces';
import { parsePagination } from '../../utils/response';
import { AuditService } from '../audit/audit.service';
import { CreatePlanDto } from './admin.dto';
import { generateInvitationToken } from '../../utils/jwt';
import { MailService } from '../mail/mail.service';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { Types } from 'mongoose';

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

    const result: PaginatedResponse<IOrganizationDocument> = {
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
    
    return result;
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
    
    // Check if we need to invite an owner
    const { ownerEmail, ownerName, ...orgData } = data;
    
    const organization = await Organization.create({
      ...orgData,
      slug,
      ownerId: adminId, // Initially set to admin until they accept invite
      status: OrgStatus.ACTIVE,
      isActive: true,
      logo: data.logo || null,
    });

    // Handle owner invitation if provided
    if (ownerEmail && ownerName) {
      // Generate invite token for owner
      const token = generateInvitationToken(ownerEmail, organization._id.toString());
      const inviteLink = `${env.adminFrontendUrl}/register?token=${token}`;
      
      // Enqueue owner-invite email
      await MailService.sendOwnerInvite(ownerEmail, ownerName, organization.name, inviteLink);
      
      logger.info(`Owner invitation queued for ${ownerEmail} for organization ${organization.name}`);
    }

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
  static async getUsers(params: { page?: number; limit?: number; search?: string; tab?: string }) {
    const { page, limit, skip } = parsePagination({
      page: params.page?.toString(),
      limit: params.limit?.toString(),
    });

    const tab = params.tab || 'active';

    // ── Invited tab: query pending invitations instead of users ───────────
    if (tab === 'invited') {
      const inviteFilter: Record<string, unknown> = { status: InvitationStatus.PENDING };

      if (params.search) {
        inviteFilter.email = { $regex: params.search, $options: 'i' };
      }

      const total = await Invitation.countDocuments(inviteFilter);
      const invitations = await Invitation.find(inviteFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('invitedBy', 'name email');

      const totalPages = Math.ceil(total / limit);

      // Shape invitations to look like user rows for the frontend table
      const data = invitations.map((inv: any) => ({
        _id: inv._id,
        name: inv.name || '—',
        email: inv.email,
        role: inv.role,
        avatar: inv.avatar || null,
        createdAt: inv.createdAt,
        invitedBy: inv.invitedBy,
        inviteStatus: inv.status,
        expiresAt: inv.expiresAt,
        _type: 'invitation',
      }));

      const result: PaginatedResponse<any> = {
        data,
        pagination: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      };
      return result;
    }

    // ── User tabs ─────────────────────────────────────────────────────────
    // Show all platform users (everyone except pure org MEMBER role)
    const filter: Record<string, unknown> = {
      globalRole: { $in: [GlobalRole.SUPER_ADMIN, GlobalRole.ADMIN, GlobalRole.USER, GlobalRole.SUPPORT] },
    };

    if (tab === 'archived' || tab === 'deactivated') {
      filter.isActive = false;
    } else if (tab === 'suspended') {
      filter.isActive = true;
      filter.status = 'suspended';
    } else {
      // Default: Active
      filter.isActive = true;
      filter.status = 'active';
    }

    if (params.search) {
      filter.$or = [
        { name: { $regex: params.search, $options: 'i' } },
        { email: { $regex: params.search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(filter);

    const users = await User.find(filter)
      .populate('suspensedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Enrich each user with their platform roles
    const { UserPlatformRole } = await import('../platform-rbac/user-platform-role.model');
    const userIds = users.map((u) => u._id);
    const userRoles = await UserPlatformRole.find({ userId: { $in: userIds }, isActive: true })
      .populate<{ roleId: { _id: string; name: string } }>('roleId', '_id name')
      .lean();

    // Build a map: userId → roles[]
    const rolesMap: Record<string, Array<{ _id: string; name: string }>> = {};
    for (const ur of userRoles) {
      const uid = ur.userId.toString();
      if (!rolesMap[uid]) rolesMap[uid] = [];
      if (ur.roleId && typeof ur.roleId === 'object') {
        rolesMap[uid].push({ _id: (ur.roleId as any)._id.toString(), name: (ur.roleId as any).name });
      }
    }

    const enrichedUsers = users.map((u) => ({
      ...u,
      roles: rolesMap[(u._id as any).toString()] || [],
    }));

    const totalPages = Math.ceil(total / limit);

    const result: PaginatedResponse<any> = {
      data: enrichedUsers,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    return result;
  }

  // Check email availability
  static async checkEmailStatus(email: string) {
    const user = await User.findOne({ email });
    const invite = await Invitation.findOne({ email, status: InvitationStatus.PENDING });
    
    return {
      exists: !!user,
      hasInvite: !!invite,
      available: !user && !invite,
    };
  }

  // Create user
  static async createUser(data: any, adminId: string): Promise<IUserDocument> {
    const user = await User.create({
      ...data,
      password: data.password || 'DefaultPassword123!', // Admin created users should have a way to reset
      globalRole: data.globalRole || GlobalRole.USER,
      avatar: data.avatar || null,
      isActive: true,
      isEmailVerified: true, // Admin created users are verified
    });

    await AuditService.log({
      userId: adminId,
      action: AuditAction.USER_UPDATED,
      resource: 'User',
      resourceId: user._id.toString(),
      metadata: { email: user.email, byAdmin: true, created: true },
    });

    return user;
  }

  // Invite user
  static async inviteUser(data: { name: string; email: string; globalRole?: GlobalRole; organizationId?: string; avatar?: string }, adminId: string) {
    const { name, email, globalRole, organizationId, avatar } = data;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.conflict('User with this email already exists');
    }

    // Check for existing pending invitation
    const existingInvite = await Invitation.findOne({ email, status: InvitationStatus.PENDING });
    if (existingInvite) {
      throw ApiError.conflict('A pending invitation already exists for this email');
    }

    // Generate token
    const token = generateInvitationToken(email, organizationId);

    // Expiry: 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // ── Save invitation record to DB ──────────────────────────────────────
    const invitation = await Invitation.create({
      email,
      name: name || '',
      ...(organizationId ? { organizationId } : {}),
      status: InvitationStatus.PENDING,
      role: globalRole || OrgRole.MEMBER,
      invitedBy: adminId,
      avatar,
      token,
      expiresAt,
    });

    // Construct invitation link
    const inviteLink = `${env.adminFrontendUrl}/register?token=${token}`;

    // Get organization name if organizationId is provided
    let organizationName = 'SaaS Admin Hub';
    if (organizationId) {
      const org = await Organization.findById(organizationId);
      if (org) organizationName = org.name;
    }

    // Send asynchronous email
    await MailService.sendOwnerInvite(email, name, organizationName, inviteLink);

    // Audit log
    await AuditService.log({
      userId: adminId,
      action: AuditAction.USER_INVITED,
      resource: 'Invitation',
      resourceId: invitation._id.toString(),
      metadata: { invitedEmail: email, byAdmin: true, type: 'admin-invitation' },
    });

    return { success: true, message: 'Invitation sent successfully' };
  }

  // Resend invitation
  static async resendInvite(invitationId: string, adminId: string) {
    const invitation = await Invitation.findById(invitationId);
    if (!invitation) throw ApiError.notFound('Invitation not found');
    if (invitation.status !== InvitationStatus.PENDING) {
      throw ApiError.badRequest('Only pending invitations can be resent');
    }

    // Refresh token + expiry
    const token = generateInvitationToken(invitation.email, invitation.organizationId?.toString());
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    invitation.token = token;
    invitation.expiresAt = expiresAt;
    await invitation.save();

    const inviteLink = `${env.adminFrontendUrl}/register?token=${token}`;
    let organizationName = 'SaaS Admin Hub';
    if (invitation.organizationId) {
      const org = await Organization.findById(invitation.organizationId);
      if (org) organizationName = org.name;
    }

    await MailService.sendOwnerInvite(invitation.email, (invitation as any).name || invitation.email, organizationName, inviteLink);

    await AuditService.log({
      userId: adminId,
      action: AuditAction.USER_INVITED,
      resource: 'Invitation',
      resourceId: invitation._id.toString(),
      metadata: { invitedEmail: invitation.email, byAdmin: true, type: 'resend' },
    });

    return { success: true, message: 'Invitation resent successfully' };
  }

  // Archive user (Instead of hard delete)
  static async archiveUser(userId: string, adminId: string) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    if (user.globalRole === GlobalRole.SUPER_ADMIN) {
      throw ApiError.forbidden('Cannot archive a Super Admin');
    }

    user.isActive = false;
    // Invalidate refresh token so any active session is force-logged out
    user.refreshToken = undefined as any;
    await user.save();

    // Also deactivate all platform roles for this user
    const { UserPlatformRole } = await import('../platform-rbac/user-platform-role.model');
    await UserPlatformRole.updateMany({ userId }, { isActive: false });

    await AuditService.log({
      userId: adminId,
      action: AuditAction.USER_DELETED,
      resource: 'User',
      resourceId: userId,
      metadata: { archived: true },
    });

    return user;
  }

  // Unarchive user
  static async unarchiveUser(userId: string, adminId: string) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    user.isActive = true;
    user.status = 'active';
    await user.save();

    // Re-activate all platform roles for this user
    const { UserPlatformRole } = await import('../platform-rbac/user-platform-role.model');
    await UserPlatformRole.updateMany({ userId }, { isActive: true });

    await AuditService.log({
      userId: adminId,
      action: AuditAction.USER_UPDATED,
      resource: 'User',
      resourceId: userId,
      metadata: { unarchived: true },
    });

    return user;
  }

  // Suspense user
  static async suspenseUser(userId: string, adminId: string, note: string) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    if (user.globalRole === GlobalRole.SUPER_ADMIN) {
      throw ApiError.forbidden('Cannot suspend a Super Admin');
    }

    user.status = 'suspended';
    user.suspenseNote = note;
    user.suspensedAt = new Date();
    user.suspensedBy = new Types.ObjectId(adminId);
    // Invalidate refresh token so active session is force-logged out
    user.refreshToken = undefined as any;
    
    await user.save();

    await AuditService.log({
      userId: adminId,
      action: AuditAction.USER_UPDATED,
      resource: 'User',
      resourceId: userId,
      metadata: { suspended: true, note },
    });

    return user;
  }

  // Restore / Un-suspend user
  static async restoreUser(userId: string, adminId: string) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    user.isActive = true;
    user.status = 'active';
    user.suspenseNote = undefined;
    user.suspensedAt = undefined;
    user.suspensedBy = undefined;
    
    await user.save();

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
  static async getAuditLogs(params: { page?: number; limit?: number; action?: any; search?: string; resource?: string }) {
    // Admin sees all logs (no organization filter)
    return AuditService.getLogs({
      page: params.page,
      limit: params.limit,
      action: params.action,
      resource: params.resource || params.search,
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
    data: { name?: string; status?: OrgStatus; plan?: Plan; logo?: string },
    adminId: string
  ): Promise<IOrganizationDocument> {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw ApiError.notFound('Organization not found');
    }

    if (data.name) organization.name = data.name;
    if (data.status) organization.status = data.status;
    if (data.plan) organization.plan = data.plan;
    if (data.logo) organization.logo = data.logo;

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
    data: { name?: string; avatar?: string; globalRole?: GlobalRole },
    adminId: string
  ): Promise<IUserDocument> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (data.name) user.name = data.name;
    if (data.avatar) user.avatar = data.avatar;
    if (data.globalRole) user.globalRole = data.globalRole;

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
