import { Lead, ILeadDocument } from './lead.model';
import { ApiError } from '../../utils/api-error';
import { LeadStatus, AuditAction } from '../../types/enums';
import { PaginatedResponse } from '../../types/interfaces';
import { parsePagination } from '../../utils/response';
import { CreateLeadDto, UpdateLeadDto } from './crm.dto';
import { AuditService } from '../audit/audit.service';

export interface LeadQueryParams {
  organizationId: string;
  status?: LeadStatus;
  assignedTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class CrmService {
  // Create lead
  static async createLead(
    organizationId: string,
    createdBy: string,
    dto: CreateLeadDto
  ): Promise<ILeadDocument> {
    // Check for duplicate email in organization
    const existingLead = await Lead.findOne({
      organizationId,
      email: dto.email,
    });
    if (existingLead) {
      throw ApiError.conflict('A lead with this email already exists');
    }

    const lead = await Lead.create({
      ...dto,
      organizationId,
    });

    // Audit log
    await AuditService.log({
      organizationId,
      userId: createdBy,
      action: AuditAction.LEAD_CREATED,
      resource: 'Lead',
      resourceId: lead._id.toString(),
      metadata: { email: lead.email, name: lead.name },
    });

    return lead;
  }

  // Get lead by ID
  static async getById(leadId: string, organizationId: string): Promise<ILeadDocument> {
    const lead = await Lead.findOne({ _id: leadId, organizationId })
      .populate('assignedTo', 'name email');
    
    if (!lead) {
      throw ApiError.notFound('Lead not found');
    }
    
    return lead;
  }

  // Get leads with filters
  static async getLeads(params: LeadQueryParams): Promise<PaginatedResponse<ILeadDocument>> {
    const { page, limit, skip } = parsePagination({
      page: params.page?.toString(),
      limit: params.limit?.toString(),
    });

    // Build filter
    const filter: Record<string, unknown> = {
      organizationId: params.organizationId,
    };

    if (params.status) {
      filter.status = params.status;
    }

    if (params.assignedTo) {
      filter.assignedTo = params.assignedTo;
    }

    if (params.search) {
      filter.$or = [
        { name: { $regex: params.search, $options: 'i' } },
        { email: { $regex: params.search, $options: 'i' } },
        { company: { $regex: params.search, $options: 'i' } },
      ];
    }

    // Get total count
    const total = await Lead.countDocuments(filter);

    // Get leads
    const leads = await Lead.find(filter)
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    return {
      data: leads,
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

  // Update lead
  static async updateLead(
    leadId: string,
    organizationId: string,
    updatedBy: string,
    dto: UpdateLeadDto
  ): Promise<ILeadDocument> {
    const lead = await Lead.findOne({ _id: leadId, organizationId });
    if (!lead) {
      throw ApiError.notFound('Lead not found');
    }

    const oldStatus = lead.status;
    const changes: Record<string, unknown> = {};

    // Track changes
    Object.keys(dto).forEach((key) => {
      const dtoValue = (dto as Record<string, unknown>)[key];
      if (dtoValue !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        changes[key] = { old: (lead as any)[key], new: dtoValue };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (lead as any)[key] = dtoValue;
      }
    });

    await lead.save();

    // Determine audit action
    let action = AuditAction.LEAD_UPDATED;
    if (dto.status && dto.status !== oldStatus) {
      action = AuditAction.LEAD_STATUS_CHANGED;
    }
    if (dto.assignedTo) {
      action = AuditAction.LEAD_ASSIGNED;
    }

    // Audit log
    await AuditService.log({
      organizationId,
      userId: updatedBy,
      action,
      resource: 'Lead',
      resourceId: leadId,
      metadata: { changes },
    });

    return lead;
  }

  // Delete lead
  static async deleteLead(
    leadId: string,
    organizationId: string,
    deletedBy: string
  ): Promise<void> {
    const lead = await Lead.findOne({ _id: leadId, organizationId });
    if (!lead) {
      throw ApiError.notFound('Lead not found');
    }

    await lead.deleteOne();

    // Audit log
    await AuditService.log({
      organizationId,
      userId: deletedBy,
      action: AuditAction.LEAD_DELETED,
      resource: 'Lead',
      resourceId: leadId,
      metadata: { email: lead.email, name: lead.name },
    });
  }

  // Get lead statistics
  static async getStatistics(organizationId: string) {
    const stats = await Lead.aggregate([
      { $match: { organizationId: organizationId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' },
        },
      },
    ]);

    const total = await Lead.countDocuments({ organizationId });
    const totalValue = await Lead.aggregate([
      { $match: { organizationId: organizationId } },
      { $group: { _id: null, total: { $sum: '$value' } } },
    ]);

    return {
      total,
      totalValue: totalValue[0]?.total || 0,
      byStatus: stats.reduce((acc, s) => {
        acc[s._id] = { count: s.count, value: s.totalValue };
        return acc;
      }, {} as Record<string, { count: number; value: number }>),
    };
  }
}
