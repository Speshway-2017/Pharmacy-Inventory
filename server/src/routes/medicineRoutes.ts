import { Router } from 'express';
import {
  getMedicines,
  getMedicineById,
  addMedicine,
  updateMedicine,
  adjustStock,
  deactivateMedicine
} from '../controllers/medicineController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

router.get('/', protect, getMedicines);
router.get('/:id', protect, getMedicineById);
router.post('/', protect, addMedicine);
router.put('/:id', protect, updateMedicine);
router.patch('/:id/stock', protect, adjustStock);
router.delete('/:id', protect, adminOnly, deactivateMedicine);

export default router;
