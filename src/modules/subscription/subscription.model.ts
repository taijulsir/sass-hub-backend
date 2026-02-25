import mongoose, { Schema, Document } from 'mongoose';
import {
  SubscriptionStatus,
  BillingCycle,
  PaymentProvider,
  SubscriptionCreatedBy,
} from '../../types/enums';
import { ISubscription } from '../../types/interfaces';

export interface ISubscriptionDocument extends Omit<ISubscription, '_id'>, Document {}

const subscriptionSchema = new Schema<ISubscriptionDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: [true, 'Plan is required'],
    },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.ACTIVE,
    },
    billingCycle: {
      type: String,
      enum: Object.values(BillingCycle),
      default: BillingCycle.MONTHLY,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    renewalDate: {
      type: Date,
    },
    trialEndDate: {
      type: Date,
    },
    isTrial: {
      type: Boolean,
      default: false,
    },
    paymentProvider: {
      type: String,
      enum: Object.values(PaymentProvider),
      default: PaymentProvider.NONE,
    },
    paymentReferenceId: {
      type: String,
    },
    createdBy: {
      type: String,
      enum: Object.values(SubscriptionCreatedBy),
      default: SubscriptionCreatedBy.ADMIN,
    },
    cancelledAt: {
      type: Date,
    },
    cancelReason: {
      type: String,
      maxlength: [500, 'Cancel reason must be less than 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
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

// Indexes — only ONE active subscription per organization at a time
subscriptionSchema.index({ organizationId: 1, status: 1 });
subscriptionSchema.index({ organizationId: 1, isActive: 1 });
subscriptionSchema.index({ planId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ renewalDate: 1 });
subscriptionSchema.index({ trialEndDate: 1 });
subscriptionSchema.index({ endDate: 1 });

export const Subscription = mongoose.model<ISubscriptionDocument>('Subscription', subscriptionSchema);
