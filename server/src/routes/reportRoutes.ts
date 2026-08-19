import { Router } from 'express';
import {
  getDashboardSummary,
  getSalesReport,
  getStockReport,
  getExpiryReport
} from '../controllers/reportController';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/dashboard', protect, getDashboardSummary);
router.get('/sales', protect, getSalesReport);
router.get('/stock', protect, getStockReport);
router.get('/expiry', protect, getExpiryReport);

export default router;
