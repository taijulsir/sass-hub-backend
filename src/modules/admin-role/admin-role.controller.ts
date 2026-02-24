import { Request, Response, NextFunction } from 'express';
import { AdminRoleService } from './admin-role.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { HttpStatus } from '../../utils/api-error';

export class AdminRoleController {
  // GET /admin/roles
  static async getRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, search, includeInactive } = req.query;
      const result = await AdminRoleService.getRoles({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search: search as string,
        includeInactive: includeInactive === 'true',
      });
      sendPaginated(
        res,
        result.data,
        result.pagination.total,
        result.pagination.page,
        result.pagination.limit,
        'Roles fetched'
      );
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/roles/all  — lightweight list for select dropdowns
  static async getAllActive(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AdminRoleService.getAllActive();
      sendSuccess(res, data, 'Roles fetched');
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/roles/:id
  static async getRole(req: Request, res: Response, next: NextFunction) {
    try {
      const role = await AdminRoleService.getRole(req.params.id);
      sendSuccess(res, role, 'Role fetched');
    } catch (err) {
      next(err);
    }
  }

  // POST /admin/roles
  static async createRole(req: Request, res: Response, next: NextFunction) {
    try {
      const role = await AdminRoleService.createRole(req.body);
      sendSuccess(res, role, 'Role created', HttpStatus.CREATED);
    } catch (err) {
      next(err);
    }
  }

  // PATCH /admin/roles/:id
  static async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const role = await AdminRoleService.updateRole(req.params.id, req.body);
      sendSuccess(res, role, 'Role updated');
    } catch (err) {
      next(err);
    }
  }

  // DELETE /admin/roles/:id  (soft archive + user cleanup)
  static async archiveRole(req: Request, res: Response, next: NextFunction) {
    try {
      await AdminRoleService.archiveRoleWithCleanup(req.params.id);
      sendSuccess(res, null, 'Role archived');
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/roles/:id/user-count
  static async getUserCount(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminRoleService.getUserCount(req.params.id);
      sendSuccess(res, result, 'User count fetched');
    } catch (err) {
      next(err);
    }
  }
}
