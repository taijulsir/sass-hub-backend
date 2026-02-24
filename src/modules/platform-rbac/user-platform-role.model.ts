import mongoose, { Schema, Document } from 'mongoose';

export interface IUserPlatformRole extends Document {
  userId: mongoose.Types.ObjectId;
  roleId: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const userPlatformRoleSchema = new Schema<IUserPlatformRole>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformRole',
      required: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

// One role per user (unique per userId+roleId), but a user can have many roles
userPlatformRoleSchema.index({ userId: 1, roleId: 1 }, { unique: true });
userPlatformRoleSchema.index({ userId: 1 });
userPlatformRoleSchema.index({ roleId: 1 });

export const UserPlatformRole = mongoose.model<IUserPlatformRole>(
  'UserPlatformRole',
  userPlatformRoleSchema
);
