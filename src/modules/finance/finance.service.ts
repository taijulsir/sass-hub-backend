import { FinancialEntry, IFinancialEntryDocument } from './financial-entry.model';
import { ApiError } from '../../utils/api-error';
import { FinanceEntryType, AuditAction } from '../../types/enums';
import { PaginatedResponse, FinanceMonthlySummary } from '../../types/interfaces';
import { parsePagination } from '../../utils/response';
import { CreateFinancialEntryDto, UpdateFinancialEntryDto } from './finance.dto';
import { AuditService } from '../audit/audit.service';

export interface FinanceQueryParams {
  organizationId: string;
  type?: FinanceEntryType;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class FinanceService {
  // Create financial entry
  static async createEntry(
    organizationId: string,
    createdBy: string,
    dto: CreateFinancialEntryDto
  ): Promise<IFinancialEntryDocument> {
    const entry = await FinancialEntry.create({
      ...dto,
      organizationId,
      createdBy,
    });

    // Audit log
    await AuditService.log({
      organizationId,
      userId: createdBy,
      action: AuditAction.FINANCE_ENTRY_CREATED,
      resource: 'FinancialEntry',
      resourceId: entry._id.toString(),
      metadata: { type: entry.type, amount: entry.amount, category: entry.category },
    });

    return entry;
  }

  // Get entry by ID
  static async getById(entryId: string, organizationId: string): Promise<IFinancialEntryDocument> {
    const entry = await FinancialEntry.findOne({ _id: entryId, organizationId })
      .populate('createdBy', 'name email');
    
    if (!entry) {
      throw ApiError.notFound('Financial entry not found');
    }
    
    return entry;
  }

  // Get entries with filters
  static async getEntries(params: FinanceQueryParams): Promise<PaginatedResponse<IFinancialEntryDocument>> {
    const { page, limit, skip } = parsePagination({
      page: params.page?.toString(),
      limit: params.limit?.toString(),
    });

    // Build filter
    const filter: Record<string, unknown> = {
      organizationId: params.organizationId,
    };

    if (params.type) {
      filter.type = params.type;
    }

    if (params.category) {
      filter.category = params.category;
    }

    // Date range filter
    if (params.startDate || params.endDate) {
      filter.date = {};
      if (params.startDate) {
        (filter.date as Record<string, Date>).$gte = params.startDate;
      }
      if (params.endDate) {
        (filter.date as Record<string, Date>).$lte = params.endDate;
      }
    }

    // Get total count
    const total = await FinancialEntry.countDocuments(filter);

    // Get entries
    const entries = await FinancialEntry.find(filter)
      .populate('createdBy', 'name email')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    return {
      data: entries,
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

  // Update entry
  static async updateEntry(
    entryId: string,
    organizationId: string,
    updatedBy: string,
    dto: UpdateFinancialEntryDto
  ): Promise<IFinancialEntryDocument> {
    const entry = await FinancialEntry.findOne({ _id: entryId, organizationId });
    if (!entry) {
      throw ApiError.notFound('Financial entry not found');
    }

    // Track changes
    const changes: Record<string, unknown> = {};
    Object.keys(dto).forEach((key) => {
      const dtoValue = (dto as Record<string, unknown>)[key];
      if (dtoValue !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        changes[key] = { old: (entry as any)[key], new: dtoValue };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (entry as any)[key] = dtoValue;
      }
    });

    await entry.save();

    // Audit log
    await AuditService.log({
      organizationId,
      userId: updatedBy,
      action: AuditAction.FINANCE_ENTRY_UPDATED,
      resource: 'FinancialEntry',
      resourceId: entryId,
      metadata: { changes },
    });

    return entry;
  }

  // Delete entry
  static async deleteEntry(
    entryId: string,
    organizationId: string,
    deletedBy: string
  ): Promise<void> {
    const entry = await FinancialEntry.findOne({ _id: entryId, organizationId });
    if (!entry) {
      throw ApiError.notFound('Financial entry not found');
    }

    await entry.deleteOne();

    // Audit log
    await AuditService.log({
      organizationId,
      userId: deletedBy,
      action: AuditAction.FINANCE_ENTRY_DELETED,
      resource: 'FinancialEntry',
      resourceId: entryId,
      metadata: { type: entry.type, amount: entry.amount },
    });
  }

  // Get monthly summary
  static async getMonthlySummary(
    organizationId: string,
    month: string // YYYY-MM format
  ): Promise<FinanceMonthlySummary> {
    const [year, monthNum] = month.split('-').map(Number);
    
    // Calculate date range for the month
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

    // Aggregate income and expenses
    const summary = await FinancialEntry.aggregate([
      {
        $match: {
          organizationId: organizationId,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Parse results
    let totalIncome = 0;
    let totalExpense = 0;
    let entryCount = 0;

    summary.forEach((item: { _id: string; total: number; count: number }) => {
      if (item._id === FinanceEntryType.INCOME) {
        totalIncome = item.total;
      } else if (item._id === FinanceEntryType.EXPENSE) {
        totalExpense = item.total;
      }
      entryCount += item.count;
    });

    return {
      month,
      year,
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      entryCount,
    };
  }

  // Get yearly summary (all months)
  static async getYearlySummary(
    organizationId: string,
    year: number
  ): Promise<FinanceMonthlySummary[]> {
    const summaries: FinanceMonthlySummary[] = [];

    for (let month = 1; month <= 12; month++) {
      const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
      const summary = await this.getMonthlySummary(organizationId, monthStr);
      summaries.push(summary);
    }

    return summaries;
  }

  // Get categories
  static async getCategories(organizationId: string): Promise<string[]> {
    const categories = await FinancialEntry.distinct('category', { organizationId });
    return categories;
  }
}
