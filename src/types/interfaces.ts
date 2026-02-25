import { Request } from 'express';
import { Types } from 'mongoose';
import { GlobalRole, OrgRole, Permission } from './enums';

// Express request with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  membership?: MembershipContext;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  email: string;
  globalRole: GlobalRole;
}

// Membership context for RBAC
export interface MembershipContext {
  membershipId: string;
  organizationId: string;
  role: OrgRole;
  permissions: Permission[];
  modulePermissions?: { module: string, actions: string[] }[];
}

// Token pair response
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Date range filter
export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

// Finance summary
export interface FinanceMonthlySummary {
  month: string; // YYYY-MM
  year: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  entryCount: number;
}

// User document interface
export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  globalRole: GlobalRole;
  isEmailVerified: boolean;
  refreshToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  googleId?: string;
  avatar?: string;
  isActive: boolean;
  
  // Suspense details
  status?: string; // e.g. 'active', 'suspended'
  suspenseNote?: string;
  suspensedAt?: Date;
  suspensedBy?: Types.ObjectId;

  // Activity tracking
  lastLoginAt?: Date;
  loginCount?: number;

  createdAt: Date;
  updatedAt: Date;
}

// Organization document interface
export interface IOrganization {
  _id: Types.ObjectId;
  organizationId: string;      // Public unique ID (e.g. org_8F4K2L9X)
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  ownerId: Types.ObjectId;
  status: string;              // OrgStatus enum
  settings?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Membership document interface
export interface IMembership {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  role: OrgRole;
  customRoleId?: Types.ObjectId;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Invitation document interface
export interface IInvitation {
  _id: Types.ObjectId;
  email: string;
  name?: string;
  organizationId?: Types.ObjectId;
  role: OrgRole;
  customRoleId?: string;
  status: string;
  invitedBy: Types.ObjectId;
  avatar?: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Subscription document interface
export interface ISubscription {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  planId: Types.ObjectId;           // References Plan document
  status: string;                    // SubscriptionStatus enum
  billingCycle: string;              // BillingCycle enum
  startDate: Date;
  endDate?: Date;
  renewalDate?: Date;
  trialEndDate?: Date;
  isTrial: boolean;
  paymentProvider: string;           // PaymentProvider enum
  paymentReferenceId?: string;       // Stripe session ID, SSLCommerz txn ID, etc.
  createdBy: string;                 // SubscriptionCreatedBy enum
  cancelledAt?: Date;
  cancelReason?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Subscription history document interface
export interface ISubscriptionHistory {
  _id: Types.ObjectId;
  subscriptionId: Types.ObjectId;
  organizationId: Types.ObjectId;
  previousPlanId?: Types.ObjectId;
  newPlanId?: Types.ObjectId;
  changeType: string;               // SubscriptionChangeType enum
  changedBy: Types.ObjectId;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// Lead document interface (CRM)
export interface ILead {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: string;
  source?: string;
  assignedTo?: Types.ObjectId;
  notes?: string;
  value?: number;
  tags?: string[];
  lastContactedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Financial entry document interface
export interface IFinancialEntry {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  type: string;
  amount: number;
  category: string;
  description?: string;
  date: Date;
  createdBy: Types.ObjectId;
  reference?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Audit log document interface
export interface IAuditLog {
  _id: Types.ObjectId;
  organizationId?: Types.ObjectId;
  userId: Types.ObjectId;
  action: string;
  resource?: string;
  resourceId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Plan document interface
export interface IPlan {
  _id: Types.ObjectId;
  name: string;                 // FREE, STARTER, PRO, ENTERPRISE
  slug: string;
  description?: string;
  price: number;                // Base monthly price
  yearlyPrice?: number;         // Discounted yearly price
  billingCycle: string;         // Default billing cycle
  features: string[];           // Array of feature descriptions
  limits: {
    maxMembers: number;
    maxLeads: number;
    maxStorage: number;         // in MB
  };
  trialDays: number;            // Default trial period for this plan
  sortOrder: number;            // Display ordering (0=FREE, 1=STARTER, 2=PRO, 3=ENTERPRISE)
  isActive: boolean;
  isPublic: boolean;            // Show on landing page pricing
  createdAt: Date;
  updatedAt: Date;
}
