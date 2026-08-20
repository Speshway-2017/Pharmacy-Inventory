import { Router } from 'express';
import {
  getMedicines,
  getMedicineById,
  addMedicine,
  updateMedicine,
  addStockToMedicine,
  adjustStock,
  deactivateMedicine,
  getStockMovements
} from '../controllers/medicineController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

router.get('/', protect, getMedicines);
router.get('/stock-movements', protect, getStockMovements);
router.get('/:id', protect, getMedicineById);
router.post('/', protect, addMedicine);
router.post('/:id/add-stock', protect, addStockToMedicine);
router.put('/:id', protect, updateMedicine);
router.patch('/:id/stock', protect, adjustStock);
router.delete('/:id', protect, adminOnly, deactivateMedicine);

export default router;
