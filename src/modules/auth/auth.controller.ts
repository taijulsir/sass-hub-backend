import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from '../../types/interfaces';
import { sendSuccess } from '../../utils/response';
import { HttpStatus } from '../../utils/api-error';

export class AuthController {
  // Register
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, tokens } = await AuthService.register(req.body);

      sendSuccess(
        res,
        {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            globalRole: user.globalRole,
          },
          tokens,
        },
        'Registration successful',
        HttpStatus.CREATED
      );
    } catch (error) {
      next(error);
    }
  }

  // Login
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, tokens } = await AuthService.login(req.body);

      sendSuccess(
        res,
        {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            globalRole: user.globalRole,
          },
          tokens,
        },
        'Login successful'
      );
    } catch (error) {
      next(error);
    }
  }

  // Refresh tokens
  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const tokens = await AuthService.refreshTokens(refreshToken);

      sendSuccess(res, { tokens }, 'Tokens refreshed');
    } catch (error) {
      next(error);
    }
  }

  // Logout
  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.logout(req.user!.userId);
      sendSuccess(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  // Change password
  static async changePassword(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await AuthService.changePassword(req.user!.userId, req.body);
      sendSuccess(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  // Get current user
  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getCurrentUser(req.user!.userId);

      sendSuccess(res, {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          globalRole: user.globalRole,
          isEmailVerified: user.isEmailVerified,
          avatar: user.avatar,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Forgot password
  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.forgotPassword(req.body);
      sendSuccess(res, null, 'If an account with that email exists, a password reset link has been sent.');
    } catch (error) {
      next(error);
    }
  }

  // Reset password
  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.resetPassword(req.body);
      sendSuccess(res, null, 'Password has been reset successfully.');
    } catch (error) {
      next(error);
    }
  }
}
