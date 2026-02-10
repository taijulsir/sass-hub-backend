import { Response, NextFunction } from 'express';
import { SubscriptionService } from './subscription.service';
import { AuthenticatedRequest } from '../../types/interfaces';
import { sendSuccess } from '../../utils/response';

export class SubscriptionController {
  // Get current subscription
  static async get(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const subscription = await SubscriptionService.getByOrganization(organizationId);

      sendSuccess(res, { subscription });
    } catch (error) {
      next(error);
    }
  }

  // Change subscription plan
  static async changePlan(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { plan, reason } = req.body;

      const subscription = await SubscriptionService.changePlan(
        organizationId,
        plan,
        req.user!.userId,
        reason
      );

      sendSuccess(res, { subscription }, 'Plan changed successfully');
    } catch (error) {
      next(error);
    }
  }

  // Cancel subscription
  static async cancel(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { reason } = req.body;

      const subscription = await SubscriptionService.cancel(
        organizationId,
        req.user!.userId,
        reason
      );

      sendSuccess(res, { subscription }, 'Subscription cancelled');
    } catch (error) {
      next(error);
    }
  }

  // Get subscription history
  static async getHistory(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const history = await SubscriptionService.getHistory(organizationId);

      sendSuccess(res, { history });
    } catch (error) {
      next(error);
    }
  }
}
