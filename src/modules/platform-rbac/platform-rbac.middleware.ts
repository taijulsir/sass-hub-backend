import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types/interfaces';
import { PlatformRbacService } from './platform-rbac.service';
import { ApiError } from '../../utils/api-error';
import { PlatformPermissionKey } from '../../constants/platform-permissions';
import { GlobalRole } from '../../types/enums';

/**
 * checkPlatformPermission
 * -----------------------
 * Factory middleware that protects a route with a specific platform permission.
 *
 * Usage:
 *   router.get('/orgs', authenticate, checkPlatformPermission(PLATFORM_PERMISSIONS.ORG_VIEW), handler)
 *
 * Rules:
 * - authenticate must run first (req.user must be set)
 * - SUPER_ADMIN bypasses all permission checks automatically
 * - Returns 403 with standard error format on failure
 */
export function checkPlatformPermission(permissionName: PlatformPermissionKey) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user?.userId) {
        return next(ApiError.unauthorized('Authentication required'));
      }

      // SUPER_ADMIN has all permissions — skip DB lookup
      if (req.user.globalRole === GlobalRole.SUPER_ADMIN) {
        return next();
      }

      const hasPermission = await PlatformRbacService.userHasPlatformPermission(
        req.user.userId,
        permissionName
      );

      if (!hasPermission) {
        return next(
          ApiError.forbidden('Forbidden: insufficient permissions')
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
