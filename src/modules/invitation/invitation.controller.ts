import { Response, NextFunction } from 'express';
import { InvitationService } from './invitation.service';
import { AuthenticatedRequest } from '../../types/interfaces';
import { sendSuccess } from '../../utils/response';
import { HttpStatus } from '../../utils/api-error';
import { InvitationStatus } from '../../types/enums';

export class InvitationController {
  // Create invitation
  static async create(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const invitation = await InvitationService.create(
        organizationId,
        req.user!.userId,
        req.body
      );

      sendSuccess(res, { invitation }, 'Invitation sent successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  // Get organization invitations
  static async getOrganizationInvitations(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const status = req.query.status as InvitationStatus | undefined;

      const invitations = await InvitationService.getOrganizationInvitations(
        organizationId,
        status
      );

      sendSuccess(res, { invitations });
    } catch (error) {
      next(error);
    }
  }

  // Accept invitation
  static async accept(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { token } = req.body;
      const invitation = await InvitationService.accept(token, req.user!.userId);

      sendSuccess(res, { invitation }, 'Invitation accepted');
    } catch (error) {
      next(error);
    }
  }

  // Cancel invitation
  static async cancel(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId, invitationId } = req.params;
      await InvitationService.cancel(invitationId, req.user!.userId, organizationId);

      sendSuccess(res, null, 'Invitation cancelled');
    } catch (error) {
      next(error);
    }
  }

  // Resend invitation
  static async resend(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId, invitationId } = req.params;
      const invitation = await InvitationService.resend(invitationId, organizationId);

      sendSuccess(res, { invitation }, 'Invitation resent');
    } catch (error) {
      next(error);
    }
  }

  // Get invitation details (public - by token)
  static async getByToken(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { token } = req.params;
      const invitation = await InvitationService.getByToken(token);

      sendSuccess(res, { invitation });
    } catch (error) {
      next(error);
    }
  }
}
