import mongoose, { Schema, Document } from 'mongoose';
import { Plan } from '../../types/enums';
import { ISubscriptionHistory } from '../../types/interfaces';

export interface ISubscriptionHistoryDocument extends Omit<ISubscriptionHistory, '_id'>, Document {}

const subscriptionHistorySchema = new Schema<ISubscriptionHistoryDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
    },
    oldPlan: {
      type: String,
      enum: Object.values(Plan),
      required: [true, 'Old plan is required'],
    },
    newPlan: {
      type: String,
      enum: Object.values(Plan),
      required: [true, 'New plan is required'],
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
    changedAt: {
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

// Indexes
subscriptionHistorySchema.index({ organizationId: 1 });
subscriptionHistorySchema.index({ changedAt: -1 });
subscriptionHistorySchema.index({ changedBy: 1 });

export const SubscriptionHistory = mongoose.model<ISubscriptionHistoryDocument>(
  'SubscriptionHistory',
  subscriptionHistorySchema
);
