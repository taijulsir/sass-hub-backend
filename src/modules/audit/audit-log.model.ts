import mongoose, { Schema, Document } from 'mongoose';
import { AuditAction } from '../../types/enums';
import { IAuditLog } from '../../types/interfaces';

export interface IAuditLogDocument extends Omit<IAuditLog, '_id'>, Document {}

const auditLogSchema = new Schema<IAuditLogDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: [true, 'Action is required'],
    },
    resource: {
      type: String,
      trim: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
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

// Indexes for efficient querying
auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });

// Make audit logs immutable (append-only)
auditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('Audit logs cannot be updated');
});

auditLogSchema.pre('updateOne', function () {
  throw new Error('Audit logs cannot be updated');
});

auditLogSchema.pre('updateMany', function () {
  throw new Error('Audit logs cannot be updated');
});

export const AuditLog = mongoose.model<IAuditLogDocument>('AuditLog', auditLogSchema);
