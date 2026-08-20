import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Medicine from '../models/Medicine';
import StockMovement from '../models/StockMovement';
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

const generatePermanentCode = (): string => {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `MED-${num}`;
};

const applyDefaults = (m: any) => ({
  ...m,
  code: m.code || `MED-${(m.id || '000000').slice(-6).toUpperCase()}`,
  strength: m.strength || '',
  dosageForm: m.dosageForm || 'Tablet',
  packageType: m.packageType || 'Strip',
  unitsPerPackage: m.unitsPerPackage && Number(m.unitsPerPackage) >= 1 ? Number(m.unitsPerPackage) : 1,
  sellingMode: m.sellingMode || 'FULL_PACKAGE_ONLY',
  looseUnitName: m.looseUnitName || 'Tablet',
  rack: m.rack || '',
  row: m.row || '',
  column: m.column || '',
  shelfBin: m.shelfBin || ''
});

export const getMedicines = async (req: Request, res: Response) => {
  try {
    const { search, category, dosageForm, status, barcode, rack } = req.query;
    let medicines: any[] = [];

    if (getIsDBConnected()) {
      let query: any = {};
      if (category) query.category = category;
      if (dosageForm) query.dosageForm = dosageForm;
      if (status) query.status = status;
      if (barcode) query.barcode = barcode;
      if (rack) query.rack = rack;

      if (search) {
        const regex = new RegExp(search as string, 'i');
        query.$or = [
          { name: regex },
          { genericName: regex },
          { code: regex },
          { barcode: regex },
          { batchNumber: regex },
          { strength: regex },
          { manufacturer: regex }
        ];
      }

      medicines = await Medicine.find(query).sort({ name: 1 });
    }

    if (!medicines.length) {
      medicines = LocalStore.getMedicines();
      if (search) {
        const q = (search as string).toLowerCase();
        medicines = medicines.filter(m =>
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.genericName && m.genericName.toLowerCase().includes(q)) ||
          (m.code && m.code.toLowerCase().includes(q)) ||
          (m.barcode && m.barcode.toLowerCase().includes(q)) ||
          (m.batchNumber && m.batchNumber.toLowerCase().includes(q)) ||
          (m.strength && m.strength.toLowerCase().includes(q)) ||
          (m.manufacturer && m.manufacturer.toLowerCase().includes(q))
        );
      }
      if (category) {
        medicines = medicines.filter(m => m.category === category);
      }
      if (dosageForm) {
        medicines = medicines.filter(m => m.dosageForm === dosageForm);
      }
      if (status) {
        medicines = medicines.filter(m => m.status === status);
      }
      if (barcode) {
        medicines = medicines.filter(m => m.barcode === barcode);
      }
      if (rack) {
        medicines = medicines.filter(m => m.rack === rack);
      }
    }

    // Refresh status & apply defaults
    const updated = medicines.map(m => {
      const withDef = applyDefaults(m);
      const currentStatus = computeMedicineStatus(withDef.quantity, withDef.reorderLevel || 10, withDef.expiryDate);
      return { ...withDef, status: currentStatus };
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
      med = await Medicine.findOne({ $or: [{ id }, { code: id }] });
    }

    if (!med) {
      const local = LocalStore.getMedicines();
      med = local.find(m => m.id === id || m.code === id);
    }

    if (!med) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    return res.json({ success: true, medicine: applyDefaults(med) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addMedicine = async (req: Request, res: Response) => {
  try {
    const {
      code,
      name,
      genericName,
      category,
      manufacturer,
      strength,
      dosageForm,
      packageType,
      unitsPerPackage,
      sellingMode,
      looseUnitName,
      batchNumber,
      expiryDate,
      mrp,
      sellingPrice,
      quantity, // base units or total calculated quantity
      reorderLevel,
      barcode,
      rack,
      row,
      column,
      shelfBin
    } = req.body;

    if (!name || !batchNumber || !expiryDate || sellingPrice === undefined || quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide all required medicine details.' });
    }

    const medId = `med-${Date.now()}`;
    const permanentCode = code || generatePermanentCode();
    const finalUnitsPerPackage = Math.max(1, Number(unitsPerPackage) || 1);
    const finalQuantity = Math.max(0, Number(quantity) || 0);

    const calculatedStatus = computeMedicineStatus(finalQuantity, Number(reorderLevel) || 10, expiryDate);

    const newMedicine = {
      id: medId,
      code: permanentCode,
      name,
      genericName: genericName || name,
      category: category || 'General',
      manufacturer: manufacturer || 'Standard Pharma',
      strength: strength || '',
      dosageForm: dosageForm || 'Tablet',
      packageType: packageType || 'Strip',
      unitsPerPackage: finalUnitsPerPackage,
      sellingMode: sellingMode || 'FULL_PACKAGE_ONLY',
      looseUnitName: looseUnitName || 'Tablet',
      batchNumber,
      expiryDate,
      mrp: Number(mrp) || Number(sellingPrice),
      sellingPrice: Number(sellingPrice),
      quantity: finalQuantity,
      reorderLevel: Number(reorderLevel) || 10,
      barcode: barcode || `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
      rack: rack || '',
      row: row || '',
      column: column || '',
      shelfBin: shelfBin || '',
      status: calculatedStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to Local JSON
    const local = LocalStore.getMedicines();
    local.unshift(newMedicine);
    LocalStore.saveMedicines(local);

    // Create Initial Stock Movement Log
    const movementLog = {
      id: `mov-${Date.now()}`,
      medicineId: medId,
      medicineName: name,
      code: permanentCode,
      type: 'STOCK_IN',
      baseQuantityChange: finalQuantity,
      batchNumber,
      expiryDate,
      reason: 'Initial Product Registration Stock',
      performedByName: (req as any).user?.name || 'Pharmacy Staff',
      createdAt: new Date().toISOString()
    };
    const localMovements = LocalStore.getStockMovements();
    localMovements.unshift(movementLog);
    LocalStore.saveStockMovements(localMovements);

    // Save to MongoDB if connected, else queue transaction
    if (getIsDBConnected()) {
      await Medicine.create(newMedicine);
      await StockMovement.create(movementLog);
    } else {
      LocalStore.addSyncTransaction({
        id: `tx-${Date.now()}`,
        transactionId: `OFFLINE-CREATE_MEDICINE-${newMedicine.id}`,
        operation: 'CREATE_MEDICINE',
        payload: newMedicine,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });
    }

    // FCM Notification Check
    if (calculatedStatus === 'LOW_STOCK') {
      sendNotification('Low Stock Alert', `Medicine ${name} stock is low (${finalQuantity} base units left).`);
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
    const index = local.findIndex(m => m.id === id || m.code === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    const existing = local[index];

    // Ensure permanent code NEVER changes on update!
    const permanentCode = existing.code || updateData.code || generatePermanentCode();
    const newQty = updateData.quantity !== undefined ? Number(updateData.quantity) : existing.quantity;
    const newReorder = updateData.reorderLevel !== undefined ? Number(updateData.reorderLevel) : existing.reorderLevel;
    const newExpiry = updateData.expiryDate || existing.expiryDate;

    const updatedMed = {
      ...existing,
      ...updateData,
      id: existing.id,
      code: permanentCode,
      unitsPerPackage: Math.max(1, Number(updateData.unitsPerPackage) || existing.unitsPerPackage || 1),
      quantity: newQty,
      reorderLevel: newReorder,
      expiryDate: newExpiry,
      status: computeMedicineStatus(newQty, newReorder, newExpiry),
      updatedAt: new Date().toISOString()
    };

    local[index] = updatedMed;
    LocalStore.saveMedicines(local);

    if (getIsDBConnected()) {
      await Medicine.findOneAndUpdate({ id: existing.id }, updatedMed);
    } else {
      LocalStore.addSyncTransaction({
        id: `tx-${Date.now()}`,
        transactionId: `OFFLINE-UPDATE_MEDICINE-${updatedMed.id}-${Date.now()}`,
        operation: 'UPDATE_MEDICINE',
        payload: updatedMed,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });
    }

    return res.json({ success: true, message: 'Medicine updated successfully.', medicine: updatedMed });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addStockToMedicine = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      batchNumber,
      expiryDate,
      packageQuantity = 0,
      looseQuantity = 0,
      mrp,
      sellingPrice,
      reason
    } = req.body;

    const local = LocalStore.getMedicines();
    const index = local.findIndex(m => m.id === id || m.code === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    const med = applyDefaults(local[index]);
    const addedBaseUnits = (Number(packageQuantity) * med.unitsPerPackage) + Number(looseQuantity);

    if (addedBaseUnits <= 0) {
      return res.status(400).json({ success: false, message: 'Stock addition quantity must be greater than 0.' });
    }

    const newTotalQuantity = med.quantity + addedBaseUnits;

    med.quantity = newTotalQuantity;
    if (batchNumber) med.batchNumber = batchNumber;
    if (expiryDate) med.expiryDate = expiryDate;
    if (mrp !== undefined) med.mrp = Number(mrp);
    if (sellingPrice !== undefined) med.sellingPrice = Number(sellingPrice);

    med.status = computeMedicineStatus(newTotalQuantity, med.reorderLevel, med.expiryDate);
    med.updatedAt = new Date().toISOString();

    local[index] = med;
    LocalStore.saveMedicines(local);

    // Create Stock Movement Log
    const movementLog = {
      id: `mov-${Date.now()}`,
      medicineId: med.id,
      medicineName: med.name,
      code: med.code,
      type: 'STOCK_IN',
      baseQuantityChange: addedBaseUnits,
      batchNumber: batchNumber || med.batchNumber,
      expiryDate: expiryDate || med.expiryDate,
      reason: reason || 'New Batch Stock Addition',
      performedByName: (req as any).user?.name || 'Pharmacy Staff',
      createdAt: new Date().toISOString()
    };
    const localMovements = LocalStore.getStockMovements();
    localMovements.unshift(movementLog);
    LocalStore.saveStockMovements(localMovements);

    if (getIsDBConnected()) {
      await Medicine.findOneAndUpdate({ id: med.id }, {
        quantity: newTotalQuantity,
        batchNumber: med.batchNumber,
        expiryDate: med.expiryDate,
        mrp: med.mrp,
        sellingPrice: med.sellingPrice,
        status: med.status
      });
      await StockMovement.create(movementLog);
    } else {
      LocalStore.addSyncTransaction({
        id: `tx-${Date.now()}`,
        transactionId: `OFFLINE-ADD_STOCK-${med.id}-${Date.now()}`,
        operation: 'ADD_STOCK',
        payload: { medicineId: med.id, quantity: addedBaseUnits },
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      message: `Added ${addedBaseUnits} base units to stock. Total available: ${newTotalQuantity} base units.`,
      medicine: med,
      movement: movementLog
    });
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
    const index = local.findIndex(m => m.id === id || m.code === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    const med = applyDefaults(local[index]);
    const delta = Number(deltaQuantity);
    const newQuantity = med.quantity + delta;

    // Business Rule Check: Stock MUST NEVER become negative!
    if (newQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock! Current stock: ${med.quantity}. Cannot reduce by ${Math.abs(delta)}.`
      });
    }

    med.quantity = newQuantity;
    med.status = computeMedicineStatus(newQuantity, med.reorderLevel, med.expiryDate);
    med.updatedAt = new Date().toISOString();

    local[index] = med;
    LocalStore.saveMedicines(local);

    // Create Stock Movement Log
    const movementLog = {
      id: `mov-${Date.now()}`,
      medicineId: med.id,
      medicineName: med.name,
      code: med.code,
      type: delta > 0 ? 'STOCK_IN' : 'ADJUSTMENT',
      baseQuantityChange: delta,
      batchNumber: med.batchNumber,
      expiryDate: med.expiryDate,
      reason: reason || (delta > 0 ? 'Manual Stock Addition' : 'Manual Stock Adjustment'),
      performedByName: (req as any).user?.name || 'Pharmacy Staff',
      createdAt: new Date().toISOString()
    };
    const localMovements = LocalStore.getStockMovements();
    localMovements.unshift(movementLog);
    LocalStore.saveStockMovements(localMovements);

    if (getIsDBConnected()) {
      await Medicine.findOneAndUpdate({ id: med.id }, { quantity: newQuantity, status: med.status });
      await StockMovement.create(movementLog);
    } else {
      LocalStore.addSyncTransaction({
        id: `tx-${Date.now()}`,
        transactionId: `OFFLINE-ADJUST_STOCK-${med.id}-${Date.now()}`,
        operation: delta > 0 ? 'ADD_STOCK' : 'DEDUCT_STOCK',
        payload: { medicineId: med.id, quantity: Math.abs(delta) },
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      message: `Stock adjusted successfully (${reason || 'Manual Adjustment'}). New stock: ${newQuantity} base units.`,
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
    const index = local.findIndex(m => m.id === id || m.code === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    local[index].status = 'INACTIVE';
    local[index].updatedAt = new Date().toISOString();
    LocalStore.saveMedicines(local);

    if (getIsDBConnected()) {
      await Medicine.findOneAndUpdate({ id: local[index].id }, { status: 'INACTIVE' });
    }

    return res.json({ success: true, message: 'Medicine deactivated.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getStockMovements = async (req: Request, res: Response) => {
  try {
    const { medicineId } = req.query;
    let movements: any[] = [];

    if (getIsDBConnected()) {
      let query: any = {};
      if (medicineId) query.medicineId = medicineId;
      movements = await StockMovement.find(query).sort({ createdAt: -1 }).limit(100);
    }

    if (!movements.length) {
      movements = LocalStore.getStockMovements();
      if (medicineId) {
        movements = movements.filter(m => m.medicineId === medicineId);
      }
    }

    return res.json({ success: true, count: movements.length, movements });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
