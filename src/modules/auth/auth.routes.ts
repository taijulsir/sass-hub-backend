import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { registerDto, loginDto, refreshTokenDto, changePasswordDto, forgotPasswordDto, resetPasswordDto } from './auth.dto';

const router = Router();

// Public routes
router.post('/register', validateBody(registerDto), AuthController.register);
router.post('/login', validateBody(loginDto), AuthController.login);
router.post('/refresh-token', validateBody(refreshTokenDto), AuthController.refreshToken);
router.post('/forgot-password', validateBody(forgotPasswordDto), AuthController.forgotPassword);
router.post('/reset-password', validateBody(resetPasswordDto), AuthController.resetPassword);

// Protected routes
router.post('/logout', authenticate, AuthController.logout);
router.post('/change-password', authenticate, validateBody(changePasswordDto), AuthController.changePassword);
router.get('/me', authenticate, AuthController.me);

export default router;
