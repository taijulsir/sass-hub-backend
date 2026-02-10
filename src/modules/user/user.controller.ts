import { Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { AuthenticatedRequest } from '../../types/interfaces';
import { sendSuccess } from '../../utils/response';

export class UserController {
  // Get current user profile
  static async getProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await UserService.getById(req.user!.userId);
      sendSuccess(res, { user });
    } catch (error) {
      next(error);
    }
  }

  // Update current user profile
  static async updateProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await UserService.update(req.user!.userId, req.body);
      sendSuccess(res, { user }, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Get user's organizations
  static async getMyOrganizations(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const organizations = await UserService.getUserOrganizations(req.user!.userId);
      sendSuccess(res, { organizations });
    } catch (error) {
      next(error);
    }
  }
}
