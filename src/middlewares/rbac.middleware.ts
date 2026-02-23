import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, MembershipContext } from '../types/interfaces';
import { Permission, OrgRole, RolePermissions, ModuleType, ActionType } from '../types/enums';
import { ApiError } from '../utils/api-error';
import { Membership } from '../modules/membership/membership.model';
import { Organization } from '../modules/organization/organization.model';
import { Role } from '../modules/role/role.model'; // Import Role model

// Load module permissions dynamically
async function loadModulePermissions(membership: any): Promise<{ module: ModuleType, actions: ActionType[] }[]> {
  if (membership.customRoleId) {
    const role = await Role.findById(membership.customRoleId);
    if (role) {
      return role.permissions.map((p: any) => ({
        module: p.module as ModuleType,
        actions: p.actions as ActionType[],
      }));
    }
  }

  // Fallback map for static roles
  const staticPermissions: Record<OrgRole, { module: ModuleType, actions: ActionType[] }[]> = {
    [OrgRole.OWNER]: Object.values(ModuleType).map(mod => ({
      module: mod,
      actions: Object.values(ActionType).filter(a => a !== ActionType.MANAGE) // Owners can do everything except maybe manage system root
    })),
    [OrgRole.ADMIN]: [
      { module: ModuleType.USER, actions: [ActionType.READ, ActionType.CREATE, ActionType.UPDATE, ActionType.DELETE] },
      { module: ModuleType.FINANCE, actions: [ActionType.READ, ActionType.CREATE] },
      { module: ModuleType.CRM, actions: [ActionType.READ, ActionType.CREATE, ActionType.UPDATE] },
      { module: ModuleType.AUDIT, actions: [ActionType.READ] },
      { module: ModuleType.ORGANIZATION, actions: [ActionType.READ, ActionType.UPDATE] },
    ],
    [OrgRole.MEMBER]: [
      { module: ModuleType.USER, actions: [ActionType.READ] },
      { module: ModuleType.FINANCE, actions: [ActionType.READ] },
      { module: ModuleType.CRM, actions: [ActionType.READ] },
      { module: ModuleType.ORGANIZATION, actions: [ActionType.READ] },
    ]
  };

  return staticPermissions[membership.role as OrgRole] || [];
}

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
      // If no organization ID is provided, skip membership check but user must be authenticated
      // This is valid for global actions like creating an organization
      return next(); 
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

    const modulePermissions = await loadModulePermissions(membership);

    // Build membership context with permissions
    const membershipContext: MembershipContext = {
      membershipId: membership._id.toString(),
      organizationId: organizationId as string,
      role: membership.role as OrgRole,
      permissions: RolePermissions[membership.role as OrgRole] || [], // Legacy support
      modulePermissions: modulePermissions, // New module permissions
    };

    req.membership = membershipContext;
    next();

  } catch (error) {
    next(error);
  }
}

// Middleware to check for required permission
export function requirePermission(requiredPermission: Permission) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.membership) {
      return next(ApiError.forbidden('Membership context required'));
    }

    if (req.membership.role === OrgRole.OWNER) {
      return next();
    }
    
    // Check allow legacy permissions
    if (req.membership.permissions.includes(requiredPermission)) {
      return next();
    }

    return next(ApiError.forbidden('Insufficient permissions'));
  };
}

// Middleware to check for module specific permission
export function requireModulePermission(module: ModuleType, action: ActionType) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.membership) {
      return next(ApiError.forbidden('Membership context required'));
    }

    if (req.membership.role === OrgRole.OWNER) {
      return next();
    }

    const permission = req.membership.modulePermissions?.find(p => p.module === module);
    
    if (permission && (permission.actions.includes(action) || permission.actions.includes(ActionType.MANAGE))) {
      return next();
    }

    return next(ApiError.forbidden(`Insufficient permissions for ${module}`));
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
