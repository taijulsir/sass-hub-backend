import mongoose, { Schema, Document } from 'mongoose';

export const SYSTEM_PLATFORM_ROLES = ['SUPER_ADMIN', 'SUPPORT_ADMIN', 'FINANCE_ADMIN'] as const;
export type SystemPlatformRoleName = typeof SYSTEM_PLATFORM_ROLES[number];

export interface IPlatformRole extends Document {
  name: string;
  description: string;
  isSystem: boolean;  // Cannot be deleted if true
  createdAt: Date;
}

const platformRoleSchema = new Schema<IPlatformRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
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

export const PlatformRole = mongoose.model<IPlatformRole>('PlatformRole', platformRoleSchema);
