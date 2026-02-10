import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { updateUserDto } from './user.dto';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get profile
router.get('/profile', UserController.getProfile);

// Update profile
router.patch('/profile', validateBody(updateUserDto), UserController.updateProfile);

// Get my organizations
router.get('/organizations', UserController.getMyOrganizations);

export default router;
