import { AdminRole, IModulePermission } from './admin-role.model';
import { ApiError } from '../../utils/api-error';
import { parsePagination } from '../../utils/response';

export class AdminRoleService {
  // ── List all roles (paginated) ────────────────────────────────────────────
  static async getRoles(params: {
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

    const total = await AdminRole.countDocuments(filter);
    const data = await AdminRole.find(filter)
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

  // ── Get single role ───────────────────────────────────────────────────────
  static async getRole(id: string) {
    const role = await AdminRole.findById(id);
    if (!role) throw ApiError.notFound('Role not found');
    return role;
  }

  // ── Create role ───────────────────────────────────────────────────────────
  static async createRole(data: {
    name: string;
    description?: string;
    permissions: IModulePermission[];
  }) {
    const existing = await AdminRole.findOne({ name: { $regex: `^${data.name}$`, $options: 'i' } });
    if (existing) throw ApiError.conflict(`Role "${data.name}" already exists`);

    const role = await AdminRole.create({
      name: data.name,
      description: data.description,
      permissions: data.permissions || [],
    });

    return role;
  }

  // ── Update role ───────────────────────────────────────────────────────────
  static async updateRole(
    id: string,
    data: { name?: string; description?: string; permissions?: IModulePermission[] }
  ) {
    const role = await AdminRole.findById(id);
    if (!role) throw ApiError.notFound('Role not found');

    if (data.name && data.name !== role.name) {
      const conflict = await AdminRole.findOne({
        name: { $regex: `^${data.name}$`, $options: 'i' },
        _id: { $ne: id },
      });
      if (conflict) throw ApiError.conflict(`Role "${data.name}" already exists`);
      role.name = data.name;
    }

    if (data.description !== undefined) role.description = data.description;
    if (data.permissions !== undefined) role.permissions = data.permissions as any;

    await role.save();
    return role;
  }

  // ── Soft-archive role ─────────────────────────────────────────────────────
  static async archiveRole(id: string) {
    const role = await AdminRole.findById(id);
    if (!role) throw ApiError.notFound('Role not found');
    role.isActive = false;
    await role.save();
    return role;
  }

  // ── Get all active roles (lightweight, for dropdowns) ─────────────────────
  static async getAllActive() {
    return AdminRole.find({ isActive: true }).select('name description').sort({ name: 1 }).lean();
  }
}
