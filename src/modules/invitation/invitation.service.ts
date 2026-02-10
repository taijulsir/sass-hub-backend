import { Invitation, IInvitationDocument } from './invitation.model';
import { Membership } from '../membership/membership.model';
import { User } from '../user/user.model';
import { ApiError } from '../../utils/api-error';
import { OrgRole, InvitationStatus, AuditAction } from '../../types/enums';
import { CreateInvitationDto } from './invitation.dto';
import { AuditService } from '../audit/audit.service';

export class InvitationService {
  // Create invitation
  static async create(
    organizationId: string,
    invitedBy: string,
    dto: CreateInvitationDto
  ): Promise<IInvitationDocument> {
    // Check if user is already a member
    const existingUser = await User.findOne({ email: dto.email });
    if (existingUser) {
      const existingMembership = await Membership.findOne({
        userId: existingUser._id,
        organizationId,
      });
      if (existingMembership) {
        throw ApiError.conflict('User is already a member of this organization');
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await Invitation.findOne({
      email: dto.email,
      organizationId,
      status: InvitationStatus.PENDING,
    });
    if (existingInvitation) {
      throw ApiError.conflict('An invitation has already been sent to this email');
    }

    // Cannot invite as owner
    if (dto.role === OrgRole.OWNER) {
      throw ApiError.badRequest('Cannot invite as owner');
    }

    // Create invitation
    const invitation = await Invitation.create({
      email: dto.email,
      organizationId,
      role: dto.role,
      invitedBy,
      status: InvitationStatus.PENDING,
    });

    // Audit log
    await AuditService.log({
      organizationId,
      userId: invitedBy,
      action: AuditAction.USER_INVITED,
      resource: 'Invitation',
      resourceId: invitation._id.toString(),
      metadata: { email: dto.email, role: dto.role },
    });

    return invitation;
  }

  // Get invitations for organization
  static async getOrganizationInvitations(
    organizationId: string,
    status?: InvitationStatus
  ): Promise<IInvitationDocument[]> {
    const filter: Record<string, unknown> = { organizationId };
    if (status) {
      filter.status = status;
    }

    return Invitation.find(filter)
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 });
  }

  // Accept invitation
  static async accept(token: string, userId: string): Promise<IInvitationDocument> {
    const invitation = await Invitation.findOne({ token });
    if (!invitation) {
      throw ApiError.notFound('Invitation not found');
    }

    // Check if expired
    if (invitation.expiresAt < new Date()) {
      invitation.status = InvitationStatus.EXPIRED;
      await invitation.save();
      throw ApiError.badRequest('Invitation has expired');
    }

    // Check status
    if (invitation.status !== InvitationStatus.PENDING) {
      throw ApiError.badRequest(`Invitation is ${invitation.status.toLowerCase()}`);
    }

    // Check if user email matches invitation
    const user = await User.findById(userId);
    if (!user || user.email !== invitation.email) {
      throw ApiError.forbidden('This invitation was sent to a different email');
    }

    // Check if already a member
    const existingMembership = await Membership.findOne({
      userId,
      organizationId: invitation.organizationId,
    });
    if (existingMembership) {
      throw ApiError.conflict('You are already a member of this organization');
    }

    // Create membership
    await Membership.create({
      userId,
      organizationId: invitation.organizationId,
      role: invitation.role,
    });

    // Update invitation
    invitation.status = InvitationStatus.ACCEPTED;
    invitation.acceptedAt = new Date();
    await invitation.save();

    // Audit log
    await AuditService.log({
      organizationId: invitation.organizationId.toString(),
      userId,
      action: AuditAction.INVITATION_ACCEPTED,
      resource: 'Invitation',
      resourceId: invitation._id.toString(),
    });

    return invitation;
  }

  // Cancel invitation
  static async cancel(
    invitationId: string,
    cancelledBy: string,
    organizationId: string
  ): Promise<void> {
    const invitation = await Invitation.findOne({
      _id: invitationId,
      organizationId,
    });

    if (!invitation) {
      throw ApiError.notFound('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw ApiError.badRequest('Can only cancel pending invitations');
    }

    invitation.status = InvitationStatus.CANCELLED;
    await invitation.save();

    // Audit log
    await AuditService.log({
      organizationId,
      userId: cancelledBy,
      action: AuditAction.INVITATION_CANCELLED,
      resource: 'Invitation',
      resourceId: invitationId,
      metadata: { email: invitation.email },
    });
  }

  // Resend invitation (creates new token)
  static async resend(
    invitationId: string,
    organizationId: string
  ): Promise<IInvitationDocument> {
    const invitation = await Invitation.findOne({
      _id: invitationId,
      organizationId,
    });

    if (!invitation) {
      throw ApiError.notFound('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw ApiError.badRequest('Can only resend pending invitations');
    }

    // Generate new token and expiry
    invitation.token = require('crypto').randomBytes(32).toString('hex');
    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await invitation.save();

    return invitation;
  }

  // Get invitation by token
  static async getByToken(token: string): Promise<IInvitationDocument | null> {
    return Invitation.findOne({ token }).populate('organizationId', 'name');
  }
}
