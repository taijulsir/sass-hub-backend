import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types/interfaces';
import { PlatformRbacService } from './platform-rbac.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../types/enums';
import { sendSuccess } from '../../utils/response';
import { HttpStatus } from '../../utils/api-error';

export class PlatformRbacController {
  // ── Permissions ──────────────────────────────────────────────────────────

  /** GET /platform-rbac/permissions */
  static async getAllPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const permissions = await PlatformRbacService.getAllPermissions();
      sendSuccess(res, permissions, 'Permissions fetched');
    } catch (err) {
      next(err);
    }
  }

  // ── Roles ────────────────────────────────────────────────────────────────

  /** GET /platform-rbac/roles */
  static async getRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page  = Number(req.query.page)  || 1;
      const limit = Number(req.query.limit) || 50;
      const result = await PlatformRbacService.getRoles(page, limit);
      sendSuccess(res, result, 'Platform roles fetched');
    } catch (err) {
      next(err);
    }
  }

  /** GET /platform-rbac/roles/:roleId */
  static async getRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = await PlatformRbacService.getRoleWithPermissions(req.params.roleId);
      sendSuccess(res, role, 'Platform role fetched');
    } catch (err) {
      next(err);
    }
  }

  /** POST /platform-rbac/roles */
  static async createRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, description } = req.body;
      const role = await PlatformRbacService.createRole(name, description, false);

      await AuditService.log({
        userId: req.user!.userId,
        action: AuditAction.PLATFORM_ROLE_CREATED,
        resource: 'PlatformRole',
        resourceId: role._id.toString(),
        metadata: { name: role.name },
      });

      sendSuccess(res, role, 'Platform role created', HttpStatus.CREATED);
    } catch (err) {
      next(err);
    }
  }

  /** PATCH /platform-rbac/roles/:roleId/permissions */
  static async updateRolePermissions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { permissions } = req.body; // string[] of permission names
      await PlatformRbacService.updateRolePermissions(req.params.roleId, permissions ?? []);

      await AuditService.log({
        userId: req.user!.userId,
        action: AuditAction.PLATFORM_ROLE_UPDATED,
        resource: 'PlatformRole',
        resourceId: req.params.roleId,
        metadata: { permissions },
      });

      sendSuccess(res, null, 'Role permissions updated');
    } catch (err) {
      next(err);
    }
  }

  /** DELETE /platform-rbac/roles/:roleId */
  static async deleteRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await PlatformRbacService.deleteRole(req.params.roleId);

      await AuditService.log({
        userId: req.user!.userId,
        action: AuditAction.PLATFORM_ROLE_DELETED,
        resource: 'PlatformRole',
        resourceId: req.params.roleId,
      });

      sendSuccess(res, null, 'Platform role deleted');
    } catch (err) {
      next(err);
    }
  }

  // ── User Role Assignment ─────────────────────────────────────────────────

  /** GET /platform-rbac/users/:userId/roles */
  static async getUserRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = await PlatformRbacService.getUserPlatformRoles(req.params.userId);
      sendSuccess(res, roles, 'User platform roles fetched');
    } catch (err) {
      next(err);
    }
  }

  /** GET /platform-rbac/users/:userId/permissions */
  static async getUserPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const permissions = await PlatformRbacService.getUserPlatformPermissions(req.params.userId);
      sendSuccess(res, permissions, 'User platform permissions fetched');
    } catch (err) {
      next(err);
    }
  }

  /** POST /platform-rbac/users/:userId/roles */
  static async assignRoleToUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roleId } = req.body;
      await PlatformRbacService.assignRoleToUser(req.params.userId, roleId, req.user!.userId);

      await AuditService.log({
        userId: req.user!.userId,
        action: AuditAction.ADMIN_ROLE_ASSIGNED,
        resource: 'User',
        resourceId: req.params.userId,
        metadata: { roleId },
      });

      sendSuccess(res, null, 'Platform role assigned to user', HttpStatus.CREATED);
    } catch (err) {
      next(err);
    }
  }

  /** DELETE /platform-rbac/users/:userId/roles/:roleId */
  static async removeRoleFromUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await PlatformRbacService.removeRoleFromUser(req.params.userId, req.params.roleId);

      await AuditService.log({
        userId: req.user!.userId,
        action: AuditAction.ADMIN_ROLE_REMOVED,
        resource: 'User',
        resourceId: req.params.userId,
        metadata: { roleId: req.params.roleId },
      });

      sendSuccess(res, null, 'Platform role removed from user');
    } catch (err) {
      next(err);
    }
  }
}
