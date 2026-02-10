import { z } from 'zod';
import { OrgStatus, Plan } from '../../types/enums';

// Admin change organization status DTO
export const adminChangeOrgStatusDto = z.object({
  status: z.nativeEnum(OrgStatus),
  reason: z.string().max(500).optional(),
});

export type AdminChangeOrgStatusDto = z.infer<typeof adminChangeOrgStatusDto>;

// Admin change organization plan DTO
export const adminChangeOrgPlanDto = z.object({
  plan: z.nativeEnum(Plan),
  reason: z.string().max(500).optional(),
});

export type AdminChangeOrgPlanDto = z.infer<typeof adminChangeOrgPlanDto>;

// Create plan DTO
export const createPlanDto = z.object({
  name: z.string().min(2).max(50),
  price: z.number().min(0),
  billingCycle: z.enum(['monthly', 'yearly']),
  features: z.array(z.string()),
  limits: z.object({
    maxMembers: z.number().min(1),
    maxLeads: z.number().min(1),
    maxStorage: z.number().min(1),
  }),
});

export type CreatePlanDto = z.infer<typeof createPlanDto>;

// Admin query DTO
export const adminQueryDto = z.object({
  status: z.nativeEnum(OrgStatus).optional(),
  plan: z.nativeEnum(Plan).optional(),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export type AdminQueryDto = z.infer<typeof adminQueryDto>;
