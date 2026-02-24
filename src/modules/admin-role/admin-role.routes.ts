import { Router } from 'express';
import { AdminRoleController } from './admin-role.controller';

const router = Router();

router.get('/all', AdminRoleController.getAllActive);
router.get('/', AdminRoleController.getRoles);
router.get('/:id', AdminRoleController.getRole);
router.post('/', AdminRoleController.createRole);
router.patch('/:id', AdminRoleController.updateRole);
router.delete('/:id', AdminRoleController.archiveRole);

export default router;
