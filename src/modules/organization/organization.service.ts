import { Organization, IOrganizationDocument } from './organization.model';
import { Membership } from '../membership/membership.model';
import { Subscription } from '../subscription/subscription.model';
import { ApiError } from '../../utils/api-error';
import { OrgRole, Plan, OrgStatus, AuditAction } from '../../types/enums';
import { CreateOrganizationDto, UpdateOrganizationDto } from './organization.dto';
import { AuditService } from '../audit/audit.service';

export class OrganizationService {
  // Create organization
  static async create(
    ownerId: string,
    dto: CreateOrganizationDto
  ): Promise<IOrganizationDocument> {
    // Create organization
    const organization = await Organization.create({
      name: dto.name,
      description: dto.description,
      ownerId,
      plan: Plan.FREE,
      status: OrgStatus.ACTIVE,
    });

    // Create owner membership
    await Membership.create({
      userId: ownerId,
      organizationId: organization._id,
      role: OrgRole.OWNER,
    });

    // Create default subscription
    await Subscription.create({
      organizationId: organization._id,
      currentPlan: Plan.FREE,
      startDate: new Date(),
      isActive: true,
    });

    // Audit log
    await AuditService.log({
      organizationId: organization._id.toString(),
      userId: ownerId,
      action: AuditAction.ORG_CREATED,
      resource: 'Organization',
      resourceId: organization._id.toString(),
      metadata: { name: organization.name },
    });

    return organization;
  }

  // Get organization by ID
  static async getById(organizationId: string): Promise<IOrganizationDocument> {
    const organization = await Organization.findById(organizationId)
      .populate('ownerId', 'name email');
    
    if (!organization) {
      throw ApiError.notFound('Organization not found');
    }
    
    return organization;
  }

  // Get organization by slug
  static async getBySlug(slug: string): Promise<IOrganizationDocument | null> {
    return Organization.findOne({ slug }).populate('ownerId', 'name email');
  }

  // Update organization
  static async update(
    organizationId: string,
    userId: string,
    dto: UpdateOrganizationDto
  ): Promise<IOrganizationDocument> {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw ApiError.notFound('Organization not found');
    }

    if (dto.name) organization.name = dto.name;
    if (dto.description !== undefined) organization.description = dto.description;
    if (dto.settings) organization.settings = { ...organization.settings, ...dto.settings };

    await organization.save();

    // Audit log
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

  // Delete organization
  static async delete(organizationId: string, userId: string): Promise<void> {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw ApiError.notFound('Organization not found');
    }

    // Soft delete - set status to suspended
    organization.status = OrgStatus.SUSPENDED;
    await organization.save();

    // Audit log
    await AuditService.log({
      organizationId: organization._id.toString(),
      userId,
      action: AuditAction.ORG_DELETED,
      resource: 'Organization',
      resourceId: organization._id.toString(),
    });
  }

  // Change organization status (admin)
  static async changeStatus(
    organizationId: string,
    status: OrgStatus,
    userId: string
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
      organizationId: organization._id.toString(),
      userId,
      action,
      resource: 'Organization',
      resourceId: organization._id.toString(),
      metadata: { oldStatus, newStatus: status },
    });

    return organization;
  }

  // Get organization members
  static async getMembers(organizationId: string) {
    const memberships = await Membership.find({ organizationId })
      .populate('userId', 'name email avatar')
      .sort({ role: 1, joinedAt: -1 });

    return memberships;
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
