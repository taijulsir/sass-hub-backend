import { Plan, IPlanDocument } from './plan.model';
import { ApiError } from '../../utils/api-error';
import { parsePagination } from '../../utils/response';
import { CreatePlanDto, UpdatePlanDto } from './plan.dto';

export class PlanService {
  // ── List all plans (paginated, admin) ───────────────────────────────────
  static async getPlans(params: {
    page?: number;
    limit?: number;
    search?: string;
    includeInactive?: boolean;
  }) {
    const { page, limit, skip } = parsePagination({
      page: params.page?.toString(),
      limit: params.limit?.toString(),
    });

    const filter: Record<string, unknown> = {};
    if (!params.includeInactive) filter.isActive = true;
    if (params.search) {
      filter.name = { $regex: params.search, $options: 'i' };
    }

    const total = await Plan.countDocuments(filter);
    const data = await Plan.find(filter)
      .sort({ sortOrder: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);
    return {
      data,
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

  // ── Get all active plans (lightweight, for dropdowns / landing page) ────
  static async getActivePlans(): Promise<IPlanDocument[]> {
    return Plan.find({ isActive: true }).sort({ sortOrder: 1 }).lean() as any;
  }

  // ── Get public plans (for landing page pricing) ─────────────────────────
  static async getPublicPlans(): Promise<IPlanDocument[]> {
    return Plan.find({ isActive: true, isPublic: true }).sort({ sortOrder: 1 }).lean() as any;
  }

  // ── Get single plan by ID ──────────────────────────────────────────────
  static async getById(id: string): Promise<IPlanDocument> {
    const plan = await Plan.findById(id);
    if (!plan) throw ApiError.notFound('Plan not found');
    return plan;
  }

  // ── Get plan by name (e.g. 'FREE', 'STARTER') ─────────────────────────
  static async getByName(name: string): Promise<IPlanDocument> {
    const plan = await Plan.findOne({ name: name.toUpperCase(), isActive: true });
    if (!plan) throw ApiError.notFound(`Plan "${name}" not found`);
    return plan;
  }

  // ── Create plan ────────────────────────────────────────────────────────
  static async create(dto: CreatePlanDto): Promise<IPlanDocument> {
    const existing = await Plan.findOne({
      name: { $regex: `^${dto.name}$`, $options: 'i' },
    });
    if (existing) throw ApiError.conflict(`Plan "${dto.name}" already exists`);

    return Plan.create(dto);
  }

  // ── Update plan ────────────────────────────────────────────────────────
  static async update(id: string, dto: UpdatePlanDto): Promise<IPlanDocument> {
    const plan = await Plan.findById(id);
    if (!plan) throw ApiError.notFound('Plan not found');

    if (dto.name && dto.name !== plan.name) {
      const conflict = await Plan.findOne({
        name: { $regex: `^${dto.name}$`, $options: 'i' },
        _id: { $ne: id },
      });
      if (conflict) throw ApiError.conflict(`Plan "${dto.name}" already exists`);
    }

    Object.assign(plan, dto);
    await plan.save();
    return plan;
  }

  // ── Toggle plan active status ──────────────────────────────────────────
  static async toggleActive(id: string): Promise<IPlanDocument> {
    const plan = await Plan.findById(id);
    if (!plan) throw ApiError.notFound('Plan not found');

    plan.isActive = !plan.isActive;
    await plan.save();
    return plan;
  }

  // ── Delete plan (soft — set isActive = false) ─────────────────────────
  static async archive(id: string): Promise<IPlanDocument> {
    const plan = await Plan.findById(id);
    if (!plan) throw ApiError.notFound('Plan not found');

    plan.isActive = false;
    await plan.save();
    return plan;
  }
}
