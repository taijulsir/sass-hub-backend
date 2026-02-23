import { z } from 'zod';
import { OrgRole } from '../../types/enums';

// Create invitation DTO
export const createInvitationDto = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  role: z.nativeEnum(OrgRole).default(OrgRole.MEMBER),
  customRoleId: z.string().optional(),
});

export type CreateInvitationDto = z.infer<typeof createInvitationDto>;

// Accept invitation DTO
export const acceptInvitationDto = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type AcceptInvitationDto = z.infer<typeof acceptInvitationDto>;
