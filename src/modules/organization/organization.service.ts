import { Organization, IOrganizationDocument } from './organization.model';
import { Membership } from '../membership/membership.model';
import { SubscriptionService } from '../subscription/subscription.service';
import { PlanService } from '../plan/plan.service';
import { ApiError } from '../../utils/api-error';
import {
  OrgRole,
  OrgStatus,
  AuditAction,
  SubscriptionCreatedBy,
  PaymentProvider,
  BillingCycle,
} from '../../types/enums';
import { CreateOrganizationDto, UpdateOrganizationDto } from './organization.dto';
import { AuditService } from '../audit/audit.service';

export class OrganizationService {
  /**
   * Create organization (self-service or admin flow).
   * Always creates a subscription along with the organization.
   */
  static async create(
    ownerId: string,
    dto: CreateOrganizationDto,
    options?: {
      planId?: string;
      billingCycle?: BillingCycle;
      isTrial?: boolean;
      trialDays?: number;
      paymentProvider?: PaymentProvider;
      paymentReferenceId?: string;
      createdBy?: SubscriptionCreatedBy;
    }
  ): Promise<IOrganizationDocument> {
    // Resolve the plan — default to FREE
    let planId = options?.planId;
    if (!planId) {
      const freePlan = await PlanService.getByName('FREE');
      planId = freePlan._id.toString();
    }

    // Create organization
    const organization = await Organization.create({
      name: dto.name,
      description: dto.description,
      ownerId,
      status: OrgStatus.ACTIVE,
    });

    // Create owner membership
    await Membership.create({
      userId: ownerId,
      organizationId: organization._id,
      role: OrgRole.OWNER,
    });

    // Create subscription (always — org cannot exist without one)
    await SubscriptionService.create({
      organizationId: organization._id.toString(),
      planId,
      billingCycle: options?.billingCycle || BillingCycle.MONTHLY,
      isTrial: options?.isTrial ?? false,
      trialDays: options?.trialDays,
      paymentProvider: options?.paymentProvider || PaymentProvider.NONE,
      paymentReferenceId: options?.paymentReferenceId,
      createdBy: options?.createdBy || SubscriptionCreatedBy.SELF_SERVICE,
      userId: ownerId,
    });

    // Audit log
    await AuditService.log({
      organizationId: organization._id.toString(),
      userId: ownerId,
      action: AuditAction.ORG_CREATED,
      resource: 'Organization',
      resourceId: organization._id.toString(),
      metadata: { name: organization.name, organizationId: organization.organizationId },
    });

    return organization;
  }

  // Get organization by ID
  static async getById(organizationId: string): Promise<IOrganizationDocument> {
    const organization = await Organization.findById(organizationId)
      .populate('ownerId', 'name email');
    if (!organization) throw ApiError.notFound('Organization not found');
    return organization;
  }

  // Get organization by slug
  static async getBySlug(slug: string): Promise<IOrganizationDocument | null> {
    return Organization.findOne({ slug }).populate('ownerId', 'name email');
  }

  // Get organization by public organizationId (org_XXXXXXXX)
  static async getByOrgId(orgId: string): Promise<IOrganizationDocument | null> {
    return Organization.findOne({ organizationId: orgId }).populate('ownerId', 'name email');
  }

  // Update organization
  static async update(
    organizationId: string,
    userId: string,
    dto: UpdateOrganizationDto
  ): Promise<IOrganizationDocument> {
    const organization = await Organization.findById(organizationId);
    if (!organization) throw ApiError.notFound('Organization not found');

    if (dto.name) organization.name = dto.name;
    if (dto.description !== undefined) organization.description = dto.description;
    if (dto.settings) organization.settings = { ...organization.settings, ...dto.settings };

    await organization.save();

    await AuditService.log({
      organizationId: organization._id.toString(),
      userId,
      action: AuditAction.ORG_UPDATED,
      resource: 'Organization',
      resourceId: organization._id.toString(),
      metadata: { changes: dto },
    });

    return organization;
  }

  // Change organization status
  static async changeStatus(
    organizationId: string,
    status: OrgStatus,
    userId: string
  ): Promise<IOrganizationDocument> {
    const organization = await Organization.findById(organizationId);
    if (!organization) throw ApiError.notFound('Organization not found');

    const oldStatus = organization.status;
    organization.status = status;

    // If archiving, also soft-delete
    if (status === OrgStatus.ARCHIVED) {
      organization.isActive = false;
    }
    // If reactivating from archived
    if (status === OrgStatus.ACTIVE && !organization.isActive) {
      organization.isActive = true;
    }

    await organization.save();

    let action: AuditAction;
    switch (status) {
      case OrgStatus.ACTIVE:    action = AuditAction.ORG_ACTIVATED; break;
      case OrgStatus.SUSPENDED: action = AuditAction.ORG_SUSPENDED; break;
      case OrgStatus.ARCHIVED:  action = AuditAction.ORG_ARCHIVED; break;
      default:                  action = AuditAction.ORG_UPDATED; break;
    }

    await AuditService.log({
      organizationId: organization._id.toString(),
      userId,
      action,
      resource: 'Organization',
      resourceId: organization._id.toString(),
      metadata: { oldStatus, newStatus: status },
    });

    return organization;
  }

  // Soft delete organization
  static async delete(organizationId: string, userId: string): Promise<void> {
    const organization = await Organization.findById(organizationId);
    if (!organization) throw ApiError.notFound('Organization not found');

    organization.status = OrgStatus.ARCHIVED;
    organization.isActive = false;
    await organization.save();

    await AuditService.log({
      organizationId: organization._id.toString(),
      userId,
      action: AuditAction.ORG_ARCHIVED,
      resource: 'Organization',
      resourceId: organization._id.toString(),
    });
  }

  // Transfer ownership
  static async transferOwnership(
    organizationId: string,
    newOwnerId: string,
    transferredBy: string
  ): Promise<IOrganizationDocument> {
    const organization = await Organization.findById(organizationId);
    if (!organization) throw ApiError.notFound('Organization not found');

    // Check new owner is a member
    const membership = await Membership.findOne({
      organizationId,
      userId: newOwnerId,
    });
    if (!membership) throw ApiError.badRequest('New owner must be a member of the organization');

    const oldOwnerId = organization.ownerId;

    // Update organization owner
    organization.ownerId = newOwnerId as any;
    await organization.save();

    // Promote new owner membership to OWNER
    membership.role = OrgRole.OWNER;
    await membership.save();

    // Demote old owner to ADMIN
    await Membership.findOneAndUpdate(
      { organizationId, userId: oldOwnerId },
      { role: OrgRole.ADMIN }
    );

    await AuditService.log({
      organizationId: organization._id.toString(),
      userId: transferredBy,
      action: AuditAction.ORG_OWNERSHIP_TRANSFERRED,
      resource: 'Organization',
      resourceId: organization._id.toString(),
      metadata: { oldOwnerId: oldOwnerId.toString(), newOwnerId },
    });

    return organization;
  }

  // Get organization members
  static async getMembers(organizationId: string) {
    return Membership.find({ organizationId })
      .populate('userId', 'name email avatar')
      .sort({ role: 1, joinedAt: -1 });
  }

  // Get member count
  static async getMemberCount(organizationId: string): Promise<number> {
    return Membership.countDocuments({ organizationId });
  }

  // Check if user is member
  static async isMember(organizationId: string, userId: string): Promise<boolean> {
    const count = await Membership.countDocuments({ organizationId, userId });
    return count > 0;
  }

  // Check if user is owner
  static async isOwner(organizationId: string, userId: string): Promise<boolean> {
    const organization = await Organization.findById(organizationId);
    return organization?.ownerId.toString() === userId;
  }
}
