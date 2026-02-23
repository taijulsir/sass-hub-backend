import mongoose, { Schema, Document } from 'mongoose';
import { OrgRole } from '../../types/enums';
import { IMembership } from '../../types/interfaces';

export interface IMembershipDocument extends Omit<IMembership, '_id'>, Document {}

const membershipSchema = new Schema<IMembershipDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
    },
    role: {
      type: String,
      enum: Object.values(OrgRole),
      default: OrgRole.MEMBER,
    },
    customRoleId: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index to ensure unique user per organization
membershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });
membershipSchema.index({ organizationId: 1 });
membershipSchema.index({ userId: 1 });
membershipSchema.index({ role: 1 });

export const Membership = mongoose.model<IMembershipDocument>('Membership', membershipSchema);
