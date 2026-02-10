import mongoose, { Schema, Document } from 'mongoose';
import { FinanceEntryType } from '../../types/enums';
import { IFinancialEntry } from '../../types/interfaces';

export interface IFinancialEntryDocument extends Omit<IFinancialEntry, '_id'>, Document {}

const financialEntrySchema = new Schema<IFinancialEntryDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
    },
    type: {
      type: String,
      enum: Object.values(FinanceEntryType),
      required: [true, 'Entry type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: [100, 'Category must be less than 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description must be less than 500 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required'],
    },
    reference: {
      type: String,
      trim: true,
      maxlength: [100, 'Reference must be less than 100 characters'],
    },
    tags: [{
      type: String,
      trim: true,
    }],
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
financialEntrySchema.index({ organizationId: 1 });
financialEntrySchema.index({ organizationId: 1, date: -1 });
financialEntrySchema.index({ organizationId: 1, type: 1 });
financialEntrySchema.index({ organizationId: 1, category: 1 });
financialEntrySchema.index({ date: -1 });
financialEntrySchema.index({ type: 1 });
financialEntrySchema.index({ createdBy: 1 });

export const FinancialEntry = mongoose.model<IFinancialEntryDocument>('FinancialEntry', financialEntrySchema);
