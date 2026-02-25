import { z } from 'zod';
import { BillingCycle, PaymentProvider, SubscriptionCreatedBy } from '../../types/enums';

// Change subscription plan DTO
export const changeSubscriptionPlanDto = z.object({
  newPlanId: z.string().min(1, 'Plan ID is required'),
  billingCycle: z.nativeEnum(BillingCycle).optional(),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
});

export type ChangeSubscriptionPlanDto = z.infer<typeof changeSubscriptionPlanDto>;

// Cancel subscription DTO
export const cancelSubscriptionDto = z.object({
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
});

export type CancelSubscriptionDto = z.infer<typeof cancelSubscriptionDto>;

// Create subscription DTO (admin flow)
export const createSubscriptionDto = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  planId: z.string().min(1, 'Plan ID is required'),
  billingCycle: z.nativeEnum(BillingCycle).optional().default(BillingCycle.MONTHLY),
  isTrial: z.boolean().optional().default(false),
  trialDays: z.number().min(1).max(365).optional(),
  paymentProvider: z.nativeEnum(PaymentProvider).optional().default(PaymentProvider.NONE),
  paymentReferenceId: z.string().optional(),
  createdBy: z.nativeEnum(SubscriptionCreatedBy).optional().default(SubscriptionCreatedBy.ADMIN),
});

export type CreateSubscriptionDto = z.infer<typeof createSubscriptionDto>;

// Extend trial DTO
export const extendTrialDto = z.object({
  additionalDays: z.number().min(1, 'Must extend by at least 1 day').max(365, 'Cannot extend beyond 365 days'),
  reason: z.string().max(500).optional(),
});

export type ExtendTrialDto = z.infer<typeof extendTrialDto>;

// Reactivate subscription DTO
export const reactivateSubscriptionDto = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  billingCycle: z.nativeEnum(BillingCycle).optional(),
});

export type ReactivateSubscriptionDto = z.infer<typeof reactivateSubscriptionDto>;
