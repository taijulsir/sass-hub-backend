import { AuditLog, IAuditLogDocument } from './audit-log.model';
import { AuditAction } from '../../types/enums';
import { PaginatedResponse } from '../../types/interfaces';
import { parsePagination } from '../../utils/response';

export interface CreateAuditLogParams {
  organizationId?: string;
  userId: string;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface GetAuditLogsParams {
  organizationId?: string;
  userId?: string;
  action?: AuditAction;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class AuditService {
  // Create audit log entry
  static async log(params: CreateAuditLogParams): Promise<IAuditLogDocument> {
    const auditLog = await AuditLog.create({
      organizationId: params.organizationId,
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      metadata: params.metadata || {},
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return auditLog;
  }

  // Get audit logs with filters
  static async getLogs(
    params: GetAuditLogsParams
  ): Promise<PaginatedResponse<IAuditLogDocument>> {
    const { page, limit, skip } = parsePagination({
      page: params.page?.toString(),
      limit: params.limit?.toString(),
    });

    // Build filter
    const filter: Record<string, unknown> = {};

    if (params.organizationId) {
      filter.organizationId = params.organizationId;
    }

    if (params.userId) {
      filter.userId = params.userId;
    }

    if (params.action) {
      filter.action = params.action;
    }

    if (params.resource) {
      filter.resource = params.resource;
    }

    // Date range filter
    if (params.startDate || params.endDate) {
      filter.createdAt = {};
      if (params.startDate) {
        (filter.createdAt as Record<string, Date>).$gte = params.startDate;
      }
      if (params.endDate) {
        (filter.createdAt as Record<string, Date>).$lte = params.endDate;
      }
    }

    // Get total count
    const total = await AuditLog.countDocuments(filter);

    // Get logs
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email')
      .populate('organizationId', 'name');

    const totalPages = Math.ceil(total / limit);

    return {
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // Get logs by organization
  static async getOrganizationLogs(
    organizationId: string,
    params: Omit<GetAuditLogsParams, 'organizationId'>
  ): Promise<PaginatedResponse<IAuditLogDocument>> {
    return this.getLogs({ ...params, organizationId });
  }

  // Get logs by user
  static async getUserLogs(
    userId: string,
    params: Omit<GetAuditLogsParams, 'userId'>
  ): Promise<PaginatedResponse<IAuditLogDocument>> {
    return this.getLogs({ ...params, userId });
  }

  // Helper to log with request context
  static async logWithContext(
    params: CreateAuditLogParams,
    req?: { ip?: string; headers?: { 'user-agent'?: string } }
  ): Promise<IAuditLogDocument> {
    return this.log({
      ...params,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }
}
