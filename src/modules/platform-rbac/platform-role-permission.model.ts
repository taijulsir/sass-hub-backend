import mongoose, { Schema, Document } from 'mongoose';

export interface IPlatformRolePermission extends Document {
  roleId: mongoose.Types.ObjectId;
  permissionId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const platformRolePermissionSchema = new Schema<IPlatformRolePermission>(
  {
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformRole',
      required: true,
    },
    permissionId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformPermission',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Prevent duplicate role-permission pairs
platformRolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });
platformRolePermissionSchema.index({ roleId: 1 });
platformRolePermissionSchema.index({ permissionId: 1 });

export const PlatformRolePermission = mongoose.model<IPlatformRolePermission>(
  'PlatformRolePermission',
  platformRolePermissionSchema
);
