import mongoose, { Schema, Document } from 'mongoose';
import { BillingCycle } from '../../types/enums';
import { IPlan } from '../../types/interfaces';

export interface IPlanDocument extends Omit<IPlan, '_id'>, Document {}

const planSchema = new Schema<IPlanDocument>(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      unique: true,
      uppercase: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      maxlength: [500, 'Description must be less than 500 characters'],
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    yearlyPrice: {
      type: Number,
      min: [0, 'Yearly price cannot be negative'],
      default: 0,
    },
    billingCycle: {
      type: String,
      enum: Object.values(BillingCycle),
      default: BillingCycle.MONTHLY,
    },
    features: [{
      type: String,
      trim: true,
    }],
    limits: {
      maxMembers: {
        type: Number,
        default: 5,
      },
      maxLeads: {
        type: Number,
        default: 100,
      },
      maxStorage: {
        type: Number, // in MB
        default: 1024,
      },
    },
    trialDays: {
      type: Number,
      default: 0,
      min: [0, 'Trial days cannot be negative'],
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublic: {
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

// Indexes
planSchema.index({ isActive: 1 });
planSchema.index({ sortOrder: 1 });
planSchema.index({ price: 1 });

// Generate slug from name
planSchema.pre('validate', function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  next();
});

export const Plan = mongoose.model<IPlanDocument>('Plan', planSchema);
