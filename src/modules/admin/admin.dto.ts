import { z } from 'zod';
import { OrgStatus, BillingCycle } from '../../types/enums';

// Admin change organization status DTO
export const adminChangeOrgStatusDto = z.object({
  status: z.nativeEnum(OrgStatus),
  reason: z.string().max(500).optional(),
});

export type AdminChangeOrgStatusDto = z.infer<typeof adminChangeOrgStatusDto>;

// Admin change organization plan DTO
export const adminChangeOrgPlanDto = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  reason: z.string().max(500).optional(),
});

export type AdminChangeOrgPlanDto = z.infer<typeof adminChangeOrgPlanDto>;

// Admin create organization DTO
export const adminCreateOrganizationDto = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  description: z.string().max(500).optional(),
  logo: z.string().optional(),
  ownerEmail: z.string().email().optional(),
  ownerName: z.string().max(100).optional(),
  planId: z.string().optional(),
  billingCycle: z.nativeEnum(BillingCycle).optional(),
  isTrial: z.boolean().optional().default(false),
  trialDays: z.number().min(1).max(365).optional(),
  notes: z.string().max(1000).optional(),
  marketingTag: z.string().max(100).optional(),
});

export type AdminCreateOrganizationDto = z.infer<typeof adminCreateOrganizationDto>;

// Admin extend trial DTO
export const adminExtendTrialDto = z.object({
  additionalDays: z.number().min(1).max(365),
  reason: z.string().max(500).optional(),
});

export type AdminExtendTrialDto = z.infer<typeof adminExtendTrialDto>;

// Admin reactivate subscription DTO
export const adminReactivateSubscriptionDto = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  billingCycle: z.nativeEnum(BillingCycle).optional(),
});

export type AdminReactivateSubscriptionDto = z.infer<typeof adminReactivateSubscriptionDto>;

// Admin cancel subscription DTO
export const adminCancelSubscriptionDto = z.object({
  reason: z.string().max(500).optional(),
});

export type AdminCancelSubscriptionDto = z.infer<typeof adminCancelSubscriptionDto>;

// Admin transfer ownership DTO
export const adminTransferOwnershipDto = z.object({
  newOwnerId: z.string().min(1, 'New owner ID is required'),
});

export type AdminTransferOwnershipDto = z.infer<typeof adminTransferOwnershipDto>;

// Admin query DTO
export const adminQueryDto = z.object({
  status: z.nativeEnum(OrgStatus).optional(),
  planId: z.string().optional(),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export type AdminQueryDto = z.infer<typeof adminQueryDto>;
