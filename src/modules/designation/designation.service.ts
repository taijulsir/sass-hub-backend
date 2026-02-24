import { Designation, IModulePermission } from './designation.model';
import { ApiError } from '../../utils/api-error';
import { parsePagination } from '../../utils/response';

export class DesignationService {
  // ── List all designations (paginated) ────────────────────────────────────
  static async getDesignations(params: {
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

    const total = await Designation.countDocuments(filter);
    const data = await Designation.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);
    return {
      data,
      pagination: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    };
  }

  // ── Get single designation ───────────────────────────────────────────────
  static async getDesignation(id: string) {
    const designation = await Designation.findById(id);
    if (!designation) throw ApiError.notFound('Designation not found');
    return designation;
  }

  // ── Create designation ───────────────────────────────────────────────────
  static async createDesignation(data: {
    name: string;
    description?: string;
    permissions: IModulePermission[];
  }) {
    const existing = await Designation.findOne({ name: { $regex: `^${data.name}$`, $options: 'i' } });
    if (existing) throw ApiError.conflict(`Designation "${data.name}" already exists`);

    const designation = await Designation.create({
      name: data.name,
      description: data.description,
      permissions: data.permissions || [],
    });

    return designation;
  }

  // ── Update designation ───────────────────────────────────────────────────
  static async updateDesignation(
    id: string,
    data: { name?: string; description?: string; permissions?: IModulePermission[] }
  ) {
    const designation = await Designation.findById(id);
    if (!designation) throw ApiError.notFound('Designation not found');

    if (data.name && data.name !== designation.name) {
      const conflict = await Designation.findOne({
        name: { $regex: `^${data.name}$`, $options: 'i' },
        _id: { $ne: id },
      });
      if (conflict) throw ApiError.conflict(`Designation "${data.name}" already exists`);
      designation.name = data.name;
    }

    if (data.description !== undefined) designation.description = data.description;
    if (data.permissions !== undefined) designation.permissions = data.permissions as any;

    await designation.save();
    return designation;
  }

  // ── Soft-delete designation ──────────────────────────────────────────────
  static async archiveDesignation(id: string) {
    const designation = await Designation.findById(id);
    if (!designation) throw ApiError.notFound('Designation not found');
    designation.isActive = false;
    await designation.save();
    return designation;
  }

  // ── Get all active designations (for select dropdown) ───────────────────
  static async getAllActive() {
    return Designation.find({ isActive: true }).select('name description').sort({ name: 1 }).lean();
  }
}
