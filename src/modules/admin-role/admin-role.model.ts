import mongoose, { Schema, Document, Model } from 'mongoose';
import { AdminModule, AdminAction } from '../../types/enums';

export interface IModulePermission {
  module: AdminModule;
  actions: AdminAction[];
}

export interface IAdminRole {
  name: string;
  description?: string;
  permissions: IModulePermission[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAdminRoleDocument extends Omit<IAdminRole, '_id'>, Document {}
export interface IAdminRoleModel extends Model<IAdminRoleDocument> {}

const modulePermissionSchema = new Schema<IModulePermission>(
  {
    module: {
      type: String,
      enum: Object.values(AdminModule),
      required: true,
    },
    actions: [
      {
        type: String,
        enum: Object.values(AdminAction),
      },
    ],
  },
  { _id: false }
);

const adminRoleSchema = new Schema<IAdminRoleDocument>(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
      unique: true,
      maxlength: [80, 'Name must be under 80 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description must be under 300 characters'],
    },
    permissions: [modulePermissionSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

adminRoleSchema.index({ name: 1 });

// Uses the 'Designation' collection name to preserve existing MongoDB data
export const AdminRole = mongoose.model<IAdminRoleDocument, IAdminRoleModel>(
  'Designation',
  adminRoleSchema
);
