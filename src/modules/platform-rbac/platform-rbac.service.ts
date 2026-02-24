import { Types } from 'mongoose';
import { PlatformPermission } from './platform-permission.model';
import { PlatformRole, IPlatformRole } from './platform-role.model';
import { PlatformRolePermission } from './platform-role-permission.model';
import { UserPlatformRole } from './user-platform-role.model';
import { ApiError } from '../../utils/api-error';
import { PlatformPermissionKey } from '../../constants/platform-permissions';

export class PlatformRbacService {
  /**
   * Returns a flat array of permission name strings for a given user.
   * Resolves: user → [roles] → [role-permission links] → [permission names]
   */
  static async getUserPlatformPermissions(userId: string): Promise<string[]> {
    // 1. Find all roles assigned to this user
    const userRoles = await UserPlatformRole.find({ userId: new Types.ObjectId(userId) }).lean();
    if (!userRoles.length) return [];

    const roleIds = userRoles.map((ur) => ur.roleId);

    // 2. Find all role-permission links for those roles
    const rolePermissions = await PlatformRolePermission.find({
      roleId: { $in: roleIds },
    })
      .populate<{ permissionId: { name: string } }>('permissionId', 'name')
      .lean();

    // 3. Extract unique permission names
    const permNames = new Set<string>();
    for (const rp of rolePermissions) {
      const perm = rp.permissionId as any;
      if (perm?.name) permNames.add(perm.name);
    }

    return Array.from(permNames);
  }

  /**
   * Returns true if a user has the given permission name.
   */
  static async userHasPlatformPermission(
    userId: string,
    permissionName: PlatformPermissionKey
  ): Promise<boolean> {
    const permissions = await PlatformRbacService.getUserPlatformPermissions(userId);
    return permissions.includes(permissionName);
  }

  /**
   * Returns the platform roles assigned to a user, with role details populated.
   */
  static async getUserPlatformRoles(userId: string): Promise<IPlatformRole[]> {
    const userRoles = await UserPlatformRole.find({ userId: new Types.ObjectId(userId) })
      .populate<{ roleId: IPlatformRole }>('roleId')
      .lean();

    return userRoles
      .map((ur) => ur.roleId as unknown as IPlatformRole)
      .filter(Boolean);
  }

  /**
   * Assign a platform role to a user.
   * Throws 404 if role not found, 409 if already assigned.
   */
  static async assignRoleToUser(
    userId: string,
    roleId: string,
    assignedBy: string
  ): Promise<void> {
    const role = await PlatformRole.findById(roleId);
    if (!role) throw ApiError.notFound('Platform role not found');

    try {
      await UserPlatformRole.create({
        userId: new Types.ObjectId(userId),
        roleId: new Types.ObjectId(roleId),
        assignedBy: new Types.ObjectId(assignedBy),
      });
    } catch (err: any) {
      if (err.code === 11000) {
        throw ApiError.conflict('User already has this platform role');
      }
      throw err;
    }
  }

  /**
   * Remove a platform role from a user.
   */
  static async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    const result = await UserPlatformRole.findOneAndDelete({
      userId: new Types.ObjectId(userId),
      roleId: new Types.ObjectId(roleId),
    });
    if (!result) throw ApiError.notFound('Role assignment not found');
  }

  /**
   * List all platform roles (paginated).
   */
  static async getRoles(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [roles, total] = await Promise.all([
      PlatformRole.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      PlatformRole.countDocuments(),
    ]);
    return { roles, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Get a single role with its permissions populated.
   */
  static async getRoleWithPermissions(roleId: string): Promise<Record<string, any>> {
    const role = await PlatformRole.findById(roleId).lean();
    if (!role) throw ApiError.notFound('Platform role not found');

    const rolePermissions = await PlatformRolePermission.find({ roleId: new Types.ObjectId(roleId) })
      .populate<{ permissionId: { _id: string; name: string; module: string } }>('permissionId', 'name module')
      .lean();

    const permissions = rolePermissions
      .map((rp) => rp.permissionId as any)
      .filter(Boolean);

    return { ...role, permissions };
  }

  /**
   * Create a new platform role.
   */
  static async createRole(name: string, description: string, isSystem = false): Promise<IPlatformRole> {
    const existing = await PlatformRole.findOne({ name: name.toUpperCase() });
    if (existing) throw ApiError.conflict('A role with this name already exists');

    const role = await PlatformRole.create({ name: name.toUpperCase().trim(), description, isSystem });
    return role;
  }

  /**
   * Update role permissions — replaces the full permission set.
   * permissionNames: array of PLATFORM_PERMISSIONS values to assign.
   */
  static async updateRolePermissions(roleId: string, permissionNames: string[]): Promise<void> {
    const role = await PlatformRole.findById(roleId);
    if (!role) throw ApiError.notFound('Platform role not found');

    // Resolve names → ObjectIds
    const permissions = await PlatformPermission.find({ name: { $in: permissionNames } }).lean();
    const permissionIds = permissions.map((p) => p._id);

    // Replace: delete old then insert new (upsert-safe)
    await PlatformRolePermission.deleteMany({ roleId: new Types.ObjectId(roleId) });

    if (permissionIds.length > 0) {
      await PlatformRolePermission.insertMany(
        permissionIds.map((permissionId) => ({
          roleId: new Types.ObjectId(roleId),
          permissionId,
        })),
        { ordered: false } // skip duplicates silently
      );
    }
  }

  /**
   * Delete a platform role (only non-system roles).
   */
  static async deleteRole(roleId: string): Promise<void> {
    const role = await PlatformRole.findById(roleId);
    if (!role) throw ApiError.notFound('Platform role not found');
    if (role.isSystem) throw ApiError.forbidden('System roles cannot be deleted');

    // Clean up mappings
    await PlatformRolePermission.deleteMany({ roleId: new Types.ObjectId(roleId) });
    await UserPlatformRole.deleteMany({ roleId: new Types.ObjectId(roleId) });
    await PlatformRole.findByIdAndDelete(roleId);
  }

  /**
   * List all permissions (grouped by module).
   */
  static async getAllPermissions() {
    const permissions = await PlatformPermission.find().sort({ module: 1, name: 1 }).lean();
    return permissions;
  }
}
