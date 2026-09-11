import { Router } from 'express';
import { syncOfflineTransactions, getSyncStatus, backupToCloud, restoreFromCloud } from '../controllers/syncController';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/', protect, syncOfflineTransactions);
router.post('/offline', protect, syncOfflineTransactions);
router.get('/status', getSyncStatus);
router.post('/backup', protect, backupToCloud);
router.post('/restore', protect, restoreFromCloud);

export default router;
