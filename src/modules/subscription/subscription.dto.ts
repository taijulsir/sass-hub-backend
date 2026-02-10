import { z } from 'zod';
import { Plan } from '../../types/enums';

// Update subscription DTO
export const updateSubscriptionDto = z.object({
  plan: z.nativeEnum(Plan),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
});

export type UpdateSubscriptionDto = z.infer<typeof updateSubscriptionDto>;

// Cancel subscription DTO
export const cancelSubscriptionDto = z.object({
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
});

export type CancelSubscriptionDto = z.infer<typeof cancelSubscriptionDto>;
