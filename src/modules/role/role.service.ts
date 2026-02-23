import { Types } from 'mongoose';
import { Role } from './role.model';
import { ApiError } from '../../utils/api-error';
import { OrgRole, ModuleType, ActionType } from '../../types/enums';

export class RoleService {
  static async create(
    organizationId: string,
    name: string,
    permissions: { module: string; actions: string[] }[]
  ) {
    // Check if role name exists
    const existing = await Role.findOne({ organizationId, name });
    if (existing) {
      throw ApiError.badRequest('Role with this name already exists');
    }

    return await Role.create({
      organizationId,
      name,
      permissions,
      isSystemRole: false,
    });
  }

  static async update(
    roleId: string,
    organizationId: string,
    data: { name?: string; permissions?: { module: string; actions: string[] }[] }
  ) {
    const role = await Role.findOne({ _id: roleId, organizationId });
    if (!role) {
      throw ApiError.notFound('Role not found');
    }

    if (role.isSystemRole) {
      throw ApiError.badRequest('Cannot update a system role');
    }

    if (data.name) role.name = data.name;
    if (data.permissions) {
      // Validate permissions
      // ... implementation detail
      role.permissions = data.permissions as any;
    }

    await role.save();
    return role;
  }

  static async delete(roleId: string, organizationId: string) {
    const role = await Role.findOne({ _id: roleId, organizationId });
    if (!role) {
      throw ApiError.notFound('Role not found');
    }

    if (role.isSystemRole) {
      throw ApiError.badRequest('Cannot delete a system role');
    }

    await role.deleteOne();
  }

  static async getAll(organizationId: string) {
    // If we want system roles to also be in the DB, we can.
    // However, existing roles are hardcoded enums.
    return await Role.find({ organizationId });
  }

  static async getPermissions(roleName: string, customRoleId?: string): Promise<{ module: string, actions: string[] }[]> {
    if (customRoleId) {
      const role = await Role.findById(customRoleId);
      if (role) {
        return role.permissions.map(p => ({
          module: p.module,
          actions: p.actions,
        }));
      }
    }
    
    // Fallback to enum based permissions (basic)
    // This is where we wire up "Static ENUMs" to "Dynamic permissions"
    return [];
  }
}
