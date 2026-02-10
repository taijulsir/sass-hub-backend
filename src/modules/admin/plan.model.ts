import mongoose, { Schema, Document } from 'mongoose';
import { IPlan } from '../../types/interfaces';

export interface IPlanDocument extends Omit<IPlan, '_id'>, Document {}

const planSchema = new Schema<IPlanDocument>(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
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

// Indexes (slug already has unique: true in schema)
planSchema.index({ isActive: 1 });
planSchema.index({ price: 1 });

// Generate slug from name
planSchema.pre('validate', function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  next();
});

export const Plan = mongoose.model<IPlanDocument>('Plan', planSchema);
