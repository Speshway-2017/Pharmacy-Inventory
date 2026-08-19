import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Medicine from '../models/Medicine';
import { getIsDBConnected } from '../config/db';
import { LocalStore } from '../utils/localStorage';
import { sendNotification } from '../config/firebase';

type MedicineStatus = 'IN_STOCK' | 'LOW_STOCK' | 'EXPIRING' | 'EXPIRED' | 'INACTIVE';

const computeMedicineStatus = (quantity: number, reorderLevel: number, expiryDateStr: string): MedicineStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expiryDateStr);
  expDate.setHours(0, 0, 0, 0);

  if (expDate < today) {
    return 'EXPIRED';
  }

  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 90) {
    return 'EXPIRING';
  }

  if (quantity <= reorderLevel) {
    return 'LOW_STOCK';
  }

  return 'IN_STOCK';
};

export const getMedicines = async (req: Request, res: Response) => {
  try {
    const { search, category, status, barcode } = req.query;
    let medicines: any[] = [];

    if (getIsDBConnected()) {
      let query: any = {};
      if (category) query.category = category;
      if (status) query.status = status;
      if (barcode) query.barcode = barcode;
      if (search) {
        const regex = new RegExp(search as string, 'i');
        query.$or = [
          { name: regex },
          { genericName: regex },
          { barcode: regex },
          { batchNumber: regex }
        ];
      }
      medicines = await Medicine.find(query).sort({ name: 1 });
    }

    if (!medicines.length) {
      medicines = LocalStore.getMedicines();
      if (search) {
        const q = (search as string).toLowerCase();
        medicines = medicines.filter(m =>
          m.name.toLowerCase().includes(q) ||
          m.genericName.toLowerCase().includes(q) ||
          m.barcode.includes(q) ||
          m.batchNumber.toLowerCase().includes(q)
        );
      }
      if (category) {
        medicines = medicines.filter(m => m.category === category);
      }
      if (status) {
        medicines = medicines.filter(m => m.status === status);
      }
      if (barcode) {
        medicines = medicines.filter(m => m.barcode === barcode);
      }
    }

    // Refresh dynamically calculated status for accuracy
    const updated = medicines.map(m => {
      const currentStatus = computeMedicineStatus(m.quantity, m.reorderLevel || 10, m.expiryDate);
      return { ...m, status: currentStatus };
    });

    return res.json({ success: true, count: updated.length, medicines: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMedicineById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let med: any = null;

    if (getIsDBConnected()) {
      med = await Medicine.findOne({ id });
    }

    if (!med) {
      const local = LocalStore.getMedicines();
      med = local.find(m => m.id === id);
    }

    if (!med) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    return res.json({ success: true, medicine: med });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addMedicine = async (req: Request, res: Response) => {
  try {
    const {
      name,
      genericName,
      category,
      manufacturer,
      batchNumber,
      expiryDate,
      mrp,
      sellingPrice,
      quantity,
      reorderLevel,
      barcode
    } = req.body;

    if (!name || !batchNumber || !expiryDate || sellingPrice === undefined || quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide all required medicine details.' });
    }

    const medId = `med-${Date.now()}`;
    const calculatedStatus = computeMedicineStatus(quantity, reorderLevel || 10, expiryDate);

    const newMedicine = {
      id: medId,
      name,
      genericName: genericName || name,
      category: category || 'General',
      manufacturer: manufacturer || 'Standard Pharma',
      batchNumber,
      expiryDate,
      mrp: Number(mrp) || Number(sellingPrice),
      sellingPrice: Number(sellingPrice),
      quantity: Number(quantity),
      reorderLevel: Number(reorderLevel) || 10,
      barcode: barcode || `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
      status: calculatedStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to Local JSON
    const local = LocalStore.getMedicines();
    local.unshift(newMedicine);
    LocalStore.saveMedicines(local);

    // Save to MongoDB if connected
    if (getIsDBConnected()) {
      await Medicine.create(newMedicine);
    }

    // Check if low stock or expiring to trigger FCM notification
    if (calculatedStatus === 'LOW_STOCK') {
      sendNotification('Low Stock Alert', `Medicine ${name} stock is low (${quantity} left).`);
    } else if (calculatedStatus === 'EXPIRED') {
      sendNotification('Expired Medicine Alert', `Batch ${batchNumber} of ${name} has expired!`);
    }

    return res.status(201).json({ success: true, message: 'Medicine added successfully.', medicine: newMedicine });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMedicine = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const local = LocalStore.getMedicines();
    const index = local.findIndex(m => m.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    const existing = local[index];
    const newQty = updateData.quantity !== undefined ? Number(updateData.quantity) : existing.quantity;
    const newReorder = updateData.reorderLevel !== undefined ? Number(updateData.reorderLevel) : existing.reorderLevel;
    const newExpiry = updateData.expiryDate || existing.expiryDate;

    const updatedMed = {
      ...existing,
      ...updateData,
      quantity: newQty,
      reorderLevel: newReorder,
      expiryDate: newExpiry,
      status: computeMedicineStatus(newQty, newReorder, newExpiry),
      updatedAt: new Date().toISOString()
    };

    local[index] = updatedMed;
    LocalStore.saveMedicines(local);

    if (getIsDBConnected()) {
      await Medicine.findOneAndUpdate({ id }, updatedMed);
    }

    return res.json({ success: true, message: 'Medicine updated successfully.', medicine: updatedMed });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const adjustStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deltaQuantity, reason } = req.body;

    if (deltaQuantity === undefined || isNaN(Number(deltaQuantity))) {
      return res.status(400).json({ success: false, message: 'Invalid quantity specified.' });
    }

    const local = LocalStore.getMedicines();
    const index = local.findIndex(m => m.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    const med = local[index];
    const newQuantity = med.quantity + Number(deltaQuantity);

    // Business Rule Check: Stock MUST NEVER become negative
    if (newQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock! Current stock: ${med.quantity}. Cannot reduce by ${Math.abs(Number(deltaQuantity))}.`
      });
    }

    med.quantity = newQuantity;
    med.status = computeMedicineStatus(newQuantity, med.reorderLevel, med.expiryDate);
    med.updatedAt = new Date().toISOString();

    local[index] = med;
    LocalStore.saveMedicines(local);

    if (getIsDBConnected()) {
      await Medicine.findOneAndUpdate({ id }, { quantity: newQuantity, status: med.status });
    }

    return res.json({
      success: true,
      message: `Stock adjusted successfully (${reason || 'Manual Adjustment'}). New stock: ${newQuantity}`,
      medicine: med
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deactivateMedicine = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const local = LocalStore.getMedicines();
    const index = local.findIndex(m => m.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    local[index].status = 'INACTIVE';
    local[index].updatedAt = new Date().toISOString();
    LocalStore.saveMedicines(local);

    if (getIsDBConnected()) {
      await Medicine.findOneAndUpdate({ id }, { status: 'INACTIVE' });
    }

    return res.json({ success: true, message: 'Medicine deactivated.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
