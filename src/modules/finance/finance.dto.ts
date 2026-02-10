import { z } from 'zod';
import { FinanceEntryType } from '../../types/enums';

// Create financial entry DTO
export const createFinancialEntryDto = z.object({
  type: z.nativeEnum(FinanceEntryType),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required').max(100),
  description: z.string().max(500).optional(),
  date: z.string().datetime().or(z.date()).transform((val) => new Date(val)),
  reference: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateFinancialEntryDto = z.infer<typeof createFinancialEntryDto>;

// Update financial entry DTO
export const updateFinancialEntryDto = z.object({
  type: z.nativeEnum(FinanceEntryType).optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  category: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  date: z.string().datetime().or(z.date()).transform((val) => new Date(val)).optional(),
  reference: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
});

export type UpdateFinancialEntryDto = z.infer<typeof updateFinancialEntryDto>;

// Finance query DTO
export const financeQueryDto = z.object({
  type: z.nativeEnum(FinanceEntryType).optional(),
  category: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export type FinanceQueryDto = z.infer<typeof financeQueryDto>;

// Monthly summary query DTO
export const monthlySummaryQueryDto = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
});

export type MonthlySummaryQueryDto = z.infer<typeof monthlySummaryQueryDto>;
