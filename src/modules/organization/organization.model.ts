import mongoose, { Schema, Document } from 'mongoose';
import { OrgStatus } from '../../types/enums';
import { IOrganization } from '../../types/interfaces';
import crypto from 'crypto';

export interface IOrganizationDocument extends Omit<IOrganization, '_id'>, Document {}

/**
 * Generate a public organization ID like org_8F4K2L9X
 */
function generateOrgId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes I,O,0,1 for readability
  let result = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return `org_${result}`;
}

const organizationSchema = new Schema<IOrganizationDocument>(
  {
    organizationId: {
      type: String,
      required: true,
      unique: true,
      default: generateOrgId,
    },
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must be less than 100 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: [500, 'Description must be less than 500 characters'],
    },
    logo: {
      type: String,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
    status: {
      type: String,
      enum: Object.values(OrgStatus),
      default: OrgStatus.ACTIVE,
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
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

// Indexes
organizationSchema.index({ ownerId: 1 });
organizationSchema.index({ status: 1 });
organizationSchema.index({ createdAt: -1 });

// Generate slug from name
organizationSchema.pre('validate', function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '-' + Date.now().toString(36);
  }
  next();
});

export const Organization = mongoose.model<IOrganizationDocument>('Organization', organizationSchema);
