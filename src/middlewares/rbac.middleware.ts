import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, MembershipContext } from '../types/interfaces';
import { Permission, OrgRole, RolePermissions } from '../types/enums';
import { ApiError } from '../utils/api-error';
import { Membership } from '../modules/membership/membership.model';
import { Organization } from '../modules/organization/organization.model';

// Load membership for the current organization
export async function loadMembership(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    const organizationId = req.params.organizationId || req.body.organizationId || req.query.organizationId;
    
    if (!organizationId) {
      return next(ApiError.badRequest('Organization ID is required'));
    }

    // Check if organization exists and is active
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return next(ApiError.notFound('Organization not found'));
    }

    // Find user's membership in this organization
    const membership = await Membership.findOne({
      userId: req.user.userId,
      organizationId,
    });

    if (!membership) {
      return next(ApiError.forbidden('You are not a member of this organization'));
    }

    // Build membership context with permissions
    const membershipContext: MembershipContext = {
      membershipId: membership._id.toString(),
      organizationId: organizationId,
      role: membership.role,
      permissions: RolePermissions[membership.role] || [],
    };

    req.membership = membershipContext;
    next();
  } catch (error) {
    next(error);
  }
}

// Check if user has specific permission
export function requirePermission(...requiredPermissions: Permission[]) {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): void => {
    if (!req.membership) {
      return next(ApiError.forbidden('Membership context not loaded'));
    }

    const hasPermission = requiredPermissions.every((permission) =>
      req.membership!.permissions.includes(permission)
    );

    if (!hasPermission) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }

    next();
  };
}

// Check if user has any of the specified permissions
export function requireAnyPermission(...requiredPermissions: Permission[]) {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): void => {
    if (!req.membership) {
      return next(ApiError.forbidden('Membership context not loaded'));
    }

    const hasPermission = requiredPermissions.some((permission) =>
      req.membership!.permissions.includes(permission)
    );

    if (!hasPermission) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }

    next();
  };
}

// Check if user has specific role in organization
export function requireOrgRole(...roles: OrgRole[]) {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): void => {
    if (!req.membership) {
      return next(ApiError.forbidden('Membership context not loaded'));
    }

    if (!roles.includes(req.membership.role)) {
      return next(ApiError.forbidden('Insufficient role permissions'));
    }

    next();
  };
}

// Check if user is organization owner
export function requireOwner(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  return requireOrgRole(OrgRole.OWNER)(req, res, next);
}

// Check if user is at least admin
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  return requireOrgRole(OrgRole.OWNER, OrgRole.ADMIN)(req, res, next);
}
