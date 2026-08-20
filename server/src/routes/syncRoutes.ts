import { Router } from 'express';
import { syncOfflineTransactions, getSyncStatus } from '../controllers/syncController';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/', protect, syncOfflineTransactions);
router.post('/offline', protect, syncOfflineTransactions);
router.get('/status', protect, getSyncStatus);

export default router;
