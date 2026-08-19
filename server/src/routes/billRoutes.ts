import { Router } from 'express';
import { createBill, getBills, getBillByInvoice } from '../controllers/billController';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/', protect, createBill);
router.get('/', protect, getBills);
router.get('/:invoiceNumber', protect, getBillByInvoice);

export default router;
