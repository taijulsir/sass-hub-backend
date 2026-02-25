import mongoose, { Schema, Document } from 'mongoose';
import { SubscriptionChangeType } from '../../types/enums';
import { ISubscriptionHistory } from '../../types/interfaces';

export interface ISubscriptionHistoryDocument extends Omit<ISubscriptionHistory, '_id'>, Document {}

const subscriptionHistorySchema = new Schema<ISubscriptionHistoryDocument>(
  {
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      required: [true, 'Subscription is required'],
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
    },
    previousPlanId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
    },
    newPlanId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
    },
    changeType: {
      type: String,
      enum: Object.values(SubscriptionChangeType),
      required: [true, 'Change type is required'],
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Changed by user is required'],
    },
    reason: {
      type: String,
      maxlength: [500, 'Reason must be less than 500 characters'],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
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

// Indexes
subscriptionHistorySchema.index({ subscriptionId: 1 });
subscriptionHistorySchema.index({ organizationId: 1 });
subscriptionHistorySchema.index({ createdAt: -1 });
subscriptionHistorySchema.index({ changedBy: 1 });
subscriptionHistorySchema.index({ changeType: 1 });

export const SubscriptionHistory = mongoose.model<ISubscriptionHistoryDocument>(
  'SubscriptionHistory',
  subscriptionHistorySchema
);
