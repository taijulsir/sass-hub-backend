import { z } from 'zod';
import { BillingCycle } from '../../types/enums';

// Create plan DTO
export const createPlanDto = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .trim()
    .toUpperCase(),
  description: z.string().max(500).optional(),
  price: z.number().min(0, 'Price cannot be negative'),
  yearlyPrice: z.number().min(0).optional(),
  billingCycle: z.nativeEnum(BillingCycle).optional().default(BillingCycle.MONTHLY),
  features: z.array(z.string().trim()).default([]),
  limits: z.object({
    maxMembers: z.number().min(1).default(5),
    maxLeads: z.number().min(1).default(100),
    maxStorage: z.number().min(1).default(1024),
  }),
  trialDays: z.number().min(0).default(0),
  sortOrder: z.number().min(0).default(0),
  isPublic: z.boolean().optional().default(true),
});

export type CreatePlanDto = z.infer<typeof createPlanDto>;

// Update plan DTO
export const updatePlanDto = z.object({
  name: z.string().min(2).max(50).trim().toUpperCase().optional(),
  description: z.string().max(500).optional(),
  price: z.number().min(0).optional(),
  yearlyPrice: z.number().min(0).optional(),
  billingCycle: z.nativeEnum(BillingCycle).optional(),
  features: z.array(z.string().trim()).optional(),
  limits: z.object({
    maxMembers: z.number().min(1),
    maxLeads: z.number().min(1),
    maxStorage: z.number().min(1),
  }).optional(),
  trialDays: z.number().min(0).optional(),
  sortOrder: z.number().min(0).optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type UpdatePlanDto = z.infer<typeof updatePlanDto>;
