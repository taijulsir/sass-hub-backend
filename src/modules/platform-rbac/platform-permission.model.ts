import mongoose, { Schema, Document } from 'mongoose';
import { PERMISSION_MODULE_MAP, PlatformPermissionKey } from '../../constants/platform-permissions';

export interface IPlatformPermission extends Document {
  name: PlatformPermissionKey;
  module: string;
  description: string;
  createdAt: Date;
}

const platformPermissionSchema = new Schema<IPlatformPermission>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    module: {
      type: String,
      required: true,
      enum: ['ORG', 'PLAN', 'SUBSCRIPTION', 'ANALYTICS', 'AUDIT', 'ADMIN', 'DESIGNATION'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
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

platformPermissionSchema.index({ module: 1 });

export const PlatformPermission = mongoose.model<IPlatformPermission>(
  'PlatformPermission',
  platformPermissionSchema
);
