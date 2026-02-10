import { z } from 'zod';
import { LeadStatus } from '../../types/enums';

// Create lead DTO
export const createLeadDto = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  phone: z.string().max(20).optional(),
  company: z.string().max(100).optional(),
  status: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
  source: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  value: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateLeadDto = z.infer<typeof createLeadDto>;

// Update lead DTO
export const updateLeadDto = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  phone: z.string().max(20).optional(),
  company: z.string().max(100).optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  source: z.string().max(100).optional(),
  assignedTo: z.string().optional(),
  notes: z.string().max(2000).optional(),
  value: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
});

export type UpdateLeadDto = z.infer<typeof updateLeadDto>;

// Lead query DTO
export const leadQueryDto = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  assignedTo: z.string().optional(),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export type LeadQueryDto = z.infer<typeof leadQueryDto>;
