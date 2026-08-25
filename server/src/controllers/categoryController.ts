import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Category from '../models/Category';
import { getIsDBConnected } from '../config/db';
import { LocalStore } from '../utils/localStorage';

export const getCategories = async (req: Request, res: Response) => {
  try {
    let categories: any[] = [];
    if (getIsDBConnected()) {
      categories = await Category.find().sort({ name: 1 }).lean();
      LocalStore.saveCategories(categories);
    } else {
      categories = LocalStore.getCategories();
    }
    return res.json({ success: true, count: categories.length, categories });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addCategory = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const trimmedName = name.trim();
    const categories = LocalStore.getCategories();
    const exists = categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase());

    if (exists) {
      return res.status(400).json({ success: false, message: `Category '${trimmedName}' already exists.` });
    }

    const newCategory = {
      id: `cat-${Date.now()}`,
      name: trimmedName,
      description: description || '',
      createdAt: new Date().toISOString()
    };

    categories.push(newCategory);
    LocalStore.saveCategories(categories);

    if (getIsDBConnected()) {
      await Category.create(newCategory);
    }

    return res.status(201).json({ success: true, message: 'Category added successfully.', category: newCategory });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const categories = LocalStore.getCategories();
    const filtered = categories.filter(c => c.id !== id && c.name !== id);

    LocalStore.saveCategories(filtered);

    if (getIsDBConnected()) {
      await Category.deleteOne({ $or: [{ id }, { name: id }] });
    }

    return res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
