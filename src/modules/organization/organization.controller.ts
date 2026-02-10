import { Response, NextFunction } from 'express';
import { OrganizationService } from './organization.service';
import { AuthenticatedRequest } from '../../types/interfaces';
import { sendSuccess } from '../../utils/response';
import { HttpStatus } from '../../utils/api-error';

export class OrganizationController {
  // Create organization
  static async create(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const organization = await OrganizationService.create(req.user!.userId, req.body);
      sendSuccess(res, { organization }, 'Organization created successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  // Get organization by ID
  static async getById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const organization = await OrganizationService.getById(req.params.organizationId);
      sendSuccess(res, { organization });
    } catch (error) {
      next(error);
    }
  }

  // Update organization
  static async update(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const organization = await OrganizationService.update(
        req.params.organizationId,
        req.user!.userId,
        req.body
      );
      sendSuccess(res, { organization }, 'Organization updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Delete organization
  static async delete(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await OrganizationService.delete(req.params.organizationId, req.user!.userId);
      sendSuccess(res, null, 'Organization deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // Get organization members
  static async getMembers(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const members = await OrganizationService.getMembers(req.params.organizationId);
      sendSuccess(res, { members });
    } catch (error) {
      next(error);
    }
  }
}
