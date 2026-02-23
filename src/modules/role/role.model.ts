import mongoose, { Schema, Document } from 'mongoose';
import { ModuleType, ActionType } from '../../types/enums';

export interface IModulePermission {
  module: ModuleType;
  actions: ActionType[];
}

export interface IRole extends Document {
  name: string;
  organizationId: mongoose.Types.ObjectId;
  description?: string;
  permissions: IModulePermission[];
  isSystemRole: boolean; // Cannot be deleted/edited if true (e.g. Owner)
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    permissions: [
      {
        module: {
          type: String,
          enum: Object.values(ModuleType),
          required: true,
        },
        actions: [
          {
            type: String,
            enum: Object.values(ActionType),
          },
        ],
      },
    ],
    isSystemRole: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Unique role name per organization
roleSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const Role = mongoose.model<IRole>('Role', roleSchema);
