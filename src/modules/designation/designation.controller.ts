import { Request, Response, NextFunction } from 'express';
import { DesignationService } from './designation.service';
import { sendSuccess } from '../../utils/response';
import { HttpStatus } from '../../utils/api-error';
import { AuthenticatedRequest } from '../../types/interfaces';

export class DesignationController {
  // GET /admin/designations
  static async getDesignations(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, search, includeInactive } = req.query;
      const result = await DesignationService.getDesignations({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search: search as string,
        includeInactive: includeInactive === 'true',
      });
      sendSuccess(res, result, 'Designations fetched');
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/designations/all  — lightweight list for select dropdowns
  static async getAllActive(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await DesignationService.getAllActive();
      sendSuccess(res, data, 'Designations fetched');
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/designations/:id
  static async getDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      const designation = await DesignationService.getDesignation(req.params.id);
      sendSuccess(res, designation, 'Designation fetched');
    } catch (err) {
      next(err);
    }
  }

  // POST /admin/designations
  static async createDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      const designation = await DesignationService.createDesignation(req.body);
      sendSuccess(res, designation, 'Designation created', HttpStatus.CREATED);
    } catch (err) {
      next(err);
    }
  }

  // PATCH /admin/designations/:id
  static async updateDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      const designation = await DesignationService.updateDesignation(req.params.id, req.body);
      sendSuccess(res, designation, 'Designation updated');
    } catch (err) {
      next(err);
    }
  }

  // DELETE /admin/designations/:id  (soft archive)
  static async archiveDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      await DesignationService.archiveDesignation(req.params.id);
      sendSuccess(res, null, 'Designation archived');
    } catch (err) {
      next(err);
    }
  }
}
