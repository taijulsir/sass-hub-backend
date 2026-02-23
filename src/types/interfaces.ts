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
  createdAt: Date;
  updatedAt: Date;
}

// Organization document interface
export interface IOrganization {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  ownerId: Types.ObjectId;
  plan: string;
  status: string;
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
  organizationId: Types.ObjectId;
  role: OrgRole;
  customRoleId?: string;
  status: string;
  invitedBy: Types.ObjectId;
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
  currentPlan: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Subscription history document interface
export interface ISubscriptionHistory {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  oldPlan: string;
  newPlan: string;
  changedBy: Types.ObjectId;
  reason?: string;
  changedAt: Date;
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
  name: string;
  slug: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  limits: {
    maxMembers: number;
    maxLeads: number;
    maxStorage: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
