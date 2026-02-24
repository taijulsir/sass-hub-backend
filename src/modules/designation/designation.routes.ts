import { Router } from 'express';
import { DesignationController } from './designation.controller';

const router = Router();

router.get('/all', DesignationController.getAllActive);
router.get('/', DesignationController.getDesignations);
router.get('/:id', DesignationController.getDesignation);
router.post('/', DesignationController.createDesignation);
router.patch('/:id', DesignationController.updateDesignation);
router.delete('/:id', DesignationController.archiveDesignation);

export default router;
