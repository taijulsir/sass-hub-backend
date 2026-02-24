import { Router } from 'express';

// Import all module routes
import { authRoutes } from './modules/auth';
import { userRoutes } from './modules/user';
import { organizationRoutes } from './modules/organization';
import { membershipRoutes } from './modules/membership';
import { invitationRoutes } from './modules/invitation';
import { subscriptionRoutes } from './modules/subscription';
import { crmRoutes } from './modules/crm';
import { financeRoutes } from './modules/finance';
import { auditRoutes } from './modules/audit';
import { adminRoutes } from './modules/admin';
import uploadRoutes from './modules/upload/upload.routes';
import platformRbacRoutes from './modules/platform-rbac/platform-rbac.routes';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/organizations', organizationRoutes);
router.use('/memberships', membershipRoutes);
router.use('/invitations', invitationRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/crm', crmRoutes);
router.use('/finance', financeRoutes);
router.use('/audit', auditRoutes);
router.use('/admin', adminRoutes);
router.use('/upload', uploadRoutes);
router.use('/platform-rbac', platformRbacRoutes);

export default router;
