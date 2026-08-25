import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import PharmacySettings from '../models/PharmacySettings';
import { getIsDBConnected } from '../config/db';
import { LocalStore } from '../utils/localStorage';

export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = LocalStore.getSettings();
    if (getIsDBConnected()) {
      const dbSettings = await PharmacySettings.findOne().lean();
      if (dbSettings) {
        settings = { ...settings, ...dbSettings };
        LocalStore.saveSettings(settings);
      }
    }
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

    if (getIsDBConnected()) {
      await PharmacySettings.findOneAndUpdate({}, updated, { upsert: true });
    } else {
      LocalStore.addSyncTransaction({
        id: `tx-${Date.now()}`,
        transactionId: `OFFLINE-UPDATE_SETTINGS-${uuidv4()}`,
        operation: 'UPDATE_SETTINGS',
        payload: updated,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      message: 'Pharmacy settings updated successfully.',
      settings: updated
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
