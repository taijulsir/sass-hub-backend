import mongoose, { Schema, Document } from 'mongoose';
import { Plan } from '../../types/enums';
import { ISubscription } from '../../types/interfaces';

export interface ISubscriptionDocument extends Omit<ISubscription, '_id'>, Document {}

const subscriptionSchema = new Schema<ISubscriptionDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      unique: true,
    },
    currentPlan: {
      type: String,
      enum: Object.values(Plan),
      default: Plan.FREE,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    cancelledAt: {
      type: Date,
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

// Indexes (organizationId already has unique: true in schema)
subscriptionSchema.index({ currentPlan: 1 });
subscriptionSchema.index({ isActive: 1 });
subscriptionSchema.index({ endDate: 1 });

export const Subscription = mongoose.model<ISubscriptionDocument>('Subscription', subscriptionSchema);
