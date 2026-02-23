import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types/interfaces';
import { RoleService } from './role.service';
import { sendSuccess } from '../../utils/response';
import { HttpStatus } from '../../utils/api-error';

export class RoleController {
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { name, permissions } = req.body;
      const organizationId = req.params.organizationId;

      const role = await RoleService.create(organizationId, name, permissions);
      sendSuccess(res, role, 'Role created successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { roleId, organizationId } = req.params;
      const data = req.body;

      const role = await RoleService.update(roleId, organizationId, data);
      sendSuccess(res, role, 'Role updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { roleId, organizationId } = req.params;
      
      await RoleService.delete(roleId, organizationId);
      sendSuccess(res, null, 'Role deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      
      const roles = await RoleService.getAll(organizationId);
      sendSuccess(res, roles, 'Roles retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
