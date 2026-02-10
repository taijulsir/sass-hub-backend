import { z } from 'zod';

// Update user DTO
export const updateUserDto = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserDto>;

// User ID params DTO
export const userIdParamsDto = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export type UserIdParamsDto = z.infer<typeof userIdParamsDto>;
