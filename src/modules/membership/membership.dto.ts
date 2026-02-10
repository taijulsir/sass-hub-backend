import { z } from 'zod';
import { OrgRole } from '../../types/enums';

// Change member role DTO
export const changeMemberRoleDto = z.object({
  role: z.nativeEnum(OrgRole),
});

export type ChangeMemberRoleDto = z.infer<typeof changeMemberRoleDto>;

// Remove member params DTO
export const memberParamsDto = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  memberId: z.string().min(1, 'Member ID is required'),
});

export type MemberParamsDto = z.infer<typeof memberParamsDto>;
