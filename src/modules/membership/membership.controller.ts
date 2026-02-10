import { Response, NextFunction } from 'express';
import { MembershipService } from './membership.service';
import { AuthenticatedRequest } from '../../types/interfaces';
import { sendSuccess } from '../../utils/response';

export class MembershipController {
  // Change member role
  static async changeRole(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId, memberId } = req.params;
      const { role } = req.body;

      const membership = await MembershipService.changeRole(
        memberId,
        role,
        req.user!.userId,
        organizationId
      );

      sendSuccess(res, { membership }, 'Member role updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Remove member
  static async removeMember(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId, memberId } = req.params;

      await MembershipService.removeMember(memberId, req.user!.userId, organizationId);

      sendSuccess(res, null, 'Member removed successfully');
    } catch (error) {
      next(error);
    }
  }

  // Leave organization
  static async leave(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;

      await MembershipService.leaveOrganization(req.user!.userId, organizationId);

      sendSuccess(res, null, 'Left organization successfully');
    } catch (error) {
      next(error);
    }
  }

  // Transfer ownership
  static async transferOwnership(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { newOwnerId } = req.body;

      await MembershipService.transferOwnership(
        organizationId,
        req.user!.userId,
        newOwnerId
      );

      sendSuccess(res, null, 'Ownership transferred successfully');
    } catch (error) {
      next(error);
    }
  }
}
