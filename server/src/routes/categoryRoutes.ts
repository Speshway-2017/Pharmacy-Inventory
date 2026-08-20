import { Router } from 'express';
import { getCategories, addCategory, deleteCategory } from '../controllers/categoryController';

const router = Router();

router.get('/', getCategories);
router.post('/', addCategory);
router.delete('/:id', deleteCategory);

export default router;
