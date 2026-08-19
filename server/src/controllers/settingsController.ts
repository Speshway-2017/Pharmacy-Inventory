import { Request, Response } from 'express';
import { LocalStore } from '../utils/localStorage';

export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = LocalStore.getSettings();
    return res.json({ success: true, settings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const newSettings = req.body;
    const current = LocalStore.getSettings();
    const updated = { ...current, ...newSettings };
    LocalStore.saveSettings(updated);

    return res.json({
      success: true,
      message: 'Pharmacy settings updated successfully.',
      settings: updated
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
