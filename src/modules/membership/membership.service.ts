import { Membership, IMembershipDocument } from './membership.model';
import { Organization } from '../organization/organization.model';
import { ApiError } from '../../utils/api-error';
import { OrgRole, AuditAction } from '../../types/enums';
import { AuditService } from '../audit/audit.service';

export class MembershipService {
  // Get membership by ID
  static async getById(membershipId: string): Promise<IMembershipDocument> {
    const membership = await Membership.findById(membershipId)
      .populate('userId', 'name email avatar')
      .populate('organizationId', 'name');
    
    if (!membership) {
      throw ApiError.notFound('Membership not found');
    }
    
    return membership;
  }

  // Get user's membership in organization
  static async getUserMembership(
    userId: string,
    organizationId: string
  ): Promise<IMembershipDocument | null> {
    return Membership.findOne({ userId, organizationId })
      .populate('organizationId', 'name');
  }

  // Change member role
  static async changeRole(
    membershipId: string,
    newRole: OrgRole,
    changedBy: string,
    organizationId: string
  ): Promise<IMembershipDocument> {
    const membership = await Membership.findById(membershipId);
    if (!membership) {
      throw ApiError.notFound('Membership not found');
    }

    // Cannot change owner role
    if (membership.role === OrgRole.OWNER) {
      throw ApiError.badRequest('Cannot change owner role');
    }

    // Cannot promote to owner
    if (newRole === OrgRole.OWNER) {
      throw ApiError.badRequest('Cannot promote to owner');
    }

    const oldRole = membership.role;
    membership.role = newRole;
    await membership.save();

    // Audit log
    await AuditService.log({
      organizationId,
      userId: changedBy,
      action: AuditAction.ROLE_CHANGED,
      resource: 'Membership',
      resourceId: membershipId,
      metadata: { 
        targetUserId: membership.userId.toString(),
        oldRole, 
        newRole 
      },
    });

    return membership;
  }

  // Remove member from organization
  static async removeMember(
    membershipId: string,
    removedBy: string,
    organizationId: string
  ): Promise<void> {
    const membership = await Membership.findById(membershipId);
    if (!membership) {
      throw ApiError.notFound('Membership not found');
    }

    // Cannot remove owner
    if (membership.role === OrgRole.OWNER) {
      throw ApiError.badRequest('Cannot remove organization owner');
    }

    await membership.deleteOne();

    // Audit log
    await AuditService.log({
      organizationId,
      userId: removedBy,
      action: AuditAction.MEMBER_REMOVED,
      resource: 'Membership',
      resourceId: membershipId,
      metadata: { 
        removedUserId: membership.userId.toString(),
        role: membership.role,
      },
    });
  }

  // Leave organization
  static async leaveOrganization(
    userId: string,
    organizationId: string
  ): Promise<void> {
    const membership = await Membership.findOne({ userId, organizationId });
    if (!membership) {
      throw ApiError.notFound('Membership not found');
    }

    // Owner cannot leave (must transfer ownership first)
    if (membership.role === OrgRole.OWNER) {
      throw ApiError.badRequest('Owner cannot leave organization. Transfer ownership first.');
    }

    await membership.deleteOne();

    // Audit log
    await AuditService.log({
      organizationId,
      userId,
      action: AuditAction.MEMBER_REMOVED,
      resource: 'Membership',
      metadata: { leftVoluntarily: true },
    });
  }

  // Transfer ownership
  static async transferOwnership(
    organizationId: string,
    currentOwnerId: string,
    newOwnerId: string
  ): Promise<void> {
    // Verify current owner
    const organization = await Organization.findById(organizationId);
    if (!organization || organization.ownerId.toString() !== currentOwnerId) {
      throw ApiError.forbidden('Only the owner can transfer ownership');
    }

    // Check new owner is a member
    const newOwnerMembership = await Membership.findOne({
      userId: newOwnerId,
      organizationId,
    });
    if (!newOwnerMembership) {
      throw ApiError.badRequest('New owner must be a member of the organization');
    }

    // Get current owner membership
    const currentOwnerMembership = await Membership.findOne({
      userId: currentOwnerId,
      organizationId,
    });

    // Update roles
    if (currentOwnerMembership) {
      currentOwnerMembership.role = OrgRole.ADMIN;
      await currentOwnerMembership.save();
    }

    newOwnerMembership.role = OrgRole.OWNER;
    await newOwnerMembership.save();

    // Update organization owner
    organization.ownerId = newOwnerId as any;
    await organization.save();

    // Audit log
    await AuditService.log({
      organizationId,
      userId: currentOwnerId,
      action: AuditAction.ROLE_CHANGED,
      resource: 'Organization',
      resourceId: organizationId,
      metadata: { 
        previousOwner: currentOwnerId,
        newOwner: newOwnerId,
        type: 'OWNERSHIP_TRANSFER',
      },
    });
  }
}
