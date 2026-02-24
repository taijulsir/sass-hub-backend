import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';
import { OrgRole, InvitationStatus } from '../../types/enums';
import { IInvitation } from '../../types/interfaces';

export interface IInvitationDocument extends Omit<IInvitation, '_id'>, Document {}

const invitationSchema = new Schema<IInvitationDocument>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: false, // optional for admin-level invitations (no org yet)
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
    status: {
      type: String,
      enum: Object.values(InvitationStatus),
      default: InvitationStatus.PENDING,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Inviter is required'],
    },
    avatar: {
      type: String,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    acceptedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        delete ret.token; // Don't expose token in responses
        return ret;
      },
    },
  }
);

// Indexes (token already has unique: true in schema)
invitationSchema.index({ email: 1, organizationId: 1 });
invitationSchema.index({ status: 1 });
invitationSchema.index({ expiresAt: 1 });

// Generate token before validation
invitationSchema.pre('validate', function (next) {
  if (!this.token) {
    this.token = crypto.randomBytes(32).toString('hex');
  }
  if (!this.expiresAt) {
    // Default expiration: 7 days
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  next();
});

// Check if invitation is expired
invitationSchema.methods.isExpired = function (): boolean {
  return new Date() > this.expiresAt;
};

export const Invitation = mongoose.model<IInvitationDocument>('Invitation', invitationSchema);
