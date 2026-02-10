import { z } from 'zod';
import { OrgStatus, Plan } from '../../types/enums';

// Create organization DTO
export const createOrganizationDto = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
});

export type CreateOrganizationDto = z.infer<typeof createOrganizationDto>;

// Update organization DTO
export const updateOrganizationDto = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  settings: z.record(z.unknown()).optional(),
});

export type UpdateOrganizationDto = z.infer<typeof updateOrganizationDto>;

// Organization ID params DTO
export const organizationIdParamsDto = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
});

export type OrganizationIdParamsDto = z.infer<typeof organizationIdParamsDto>;

// Change organization status DTO (admin only)
export const changeOrgStatusDto = z.object({
  status: z.nativeEnum(OrgStatus),
});

export type ChangeOrgStatusDto = z.infer<typeof changeOrgStatusDto>;

// Change organization plan DTO (admin only)
export const changeOrgPlanDto = z.object({
  plan: z.nativeEnum(Plan),
  reason: z.string().max(500).optional(),
});

export type ChangeOrgPlanDto = z.infer<typeof changeOrgPlanDto>;
