import { z } from 'zod';
import { AuditAction } from '../../types/enums';

// Get audit logs query DTO
export const getAuditLogsDto = z.object({
  organizationId: z.string().optional(),
  userId: z.string().optional(),
  action: z.nativeEnum(AuditAction).optional(),
  resource: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export type GetAuditLogsDto = z.infer<typeof getAuditLogsDto>;
