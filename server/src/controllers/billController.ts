import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Bill from '../models/Bill';
import Medicine from '../models/Medicine';
import StockMovement from '../models/StockMovement';
import { getIsDBConnected } from '../config/db';
import { LocalStore } from '../utils/localStorage';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendNotification } from '../config/firebase';

const generateInvoiceNumber = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${dateStr}-${randomSuffix}`;
};

export const createBill = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { items, discountAmount = 0, discountPercentage = 0, paymentMethod = 'CASH', isOfflineCreated = false } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart cannot be empty.' });
    }

    const localMedicines = LocalStore.getMedicines();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // STEP 1: VALIDATE ALL CART ITEMS BEFORE MUTATING ANY STOCK
    for (const item of items) {
      const med = localMedicines.find(m => m.id === item.medicineId || m.barcode === item.barcode || m.code === item.code);

      if (!med) {
        return res.status(400).json({
          success: false,
          message: `Medicine '${item.name}' was not found in inventory.`
        });
      }

      // Business Rule Check: Expired medicines cannot be sold!
      const expDate = new Date(med.expiryDate);
      expDate.setHours(0, 0, 0, 0);
      if (expDate < today || med.status === 'EXPIRED') {
        return res.status(400).json({
          success: false,
          message: `Cannot sell expired medicine '${med.name}' (Batch: ${med.batchNumber}, Expiry: ${med.expiryDate}).`
        });
      }

      // Business Rule Check: Package vs Loose Selling Mode validation
      const unitType = item.unitType || 'PACKAGE';
      const unitsPerPackage = med.unitsPerPackage && Number(med.unitsPerPackage) >= 1 ? Number(med.unitsPerPackage) : 1;

      if (unitType === 'LOOSE' && med.sellingMode === 'FULL_PACKAGE_ONLY') {
        return res.status(400).json({
          success: false,
          message: `'${med.name}' is configured for FULL PACKAGE sales only. Loose unit sales are disabled.`
        });
      }

      // Calculate required base units
      const requiredBaseUnits = unitType === 'PACKAGE' ? (Number(item.quantity) * unitsPerPackage) : Number(item.quantity);

      // Business Rule Check: Stock MUST NOT become negative!
      if (med.quantity < requiredBaseUnits) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for '${med.name}'! Available: ${med.quantity} base units, Requested: ${requiredBaseUnits} base units.`
        });
      }
    }

    // STEP 2: DEDUCT STOCK & BUILD BILL ITEMS & STOCK MOVEMENTS
    let subtotal = 0;
    const processedBillItems = [];
    const localMovements = LocalStore.getStockMovements();

    for (const item of items) {
      const index = localMedicines.findIndex(m => m.id === item.medicineId || m.barcode === item.barcode || m.code === item.code);
      const med = localMedicines[index];

      const unitType = item.unitType || 'PACKAGE';
      const unitsPerPackage = med.unitsPerPackage && Number(med.unitsPerPackage) >= 1 ? Number(med.unitsPerPackage) : 1;
      const baseUnitsDeducted = unitType === 'PACKAGE' ? (Number(item.quantity) * unitsPerPackage) : Number(item.quantity);

      const unitPrice = Number(item.unitPrice) || Number(med.sellingPrice) || 0;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const totalPrice = Math.round(unitPrice * quantity * 100) / 100;

      med.quantity -= baseUnitsDeducted;
      subtotal += totalPrice;

      // Update status
      if (med.quantity <= med.reorderLevel) {
        med.status = med.quantity <= 0 ? 'LOW_STOCK' : 'LOW_STOCK';
      }

      localMedicines[index] = med;

      processedBillItems.push({
        medicineId: med.id,
        code: med.code || `MED-${med.id.slice(-6).toUpperCase()}`,
        name: med.name,
        genericName: med.genericName || med.name,
        batchNumber: med.batchNumber,
        expiryDate: med.expiryDate,
        unitPrice,
        quantity,
        unitType,
        unitsPerPackage,
        looseUnitName: med.looseUnitName || 'Tablet',
        baseUnitsDeducted,
        totalPrice
      });

      // Log Stock Out Movement
      const movementLog = {
        id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        medicineId: med.id,
        medicineName: med.name,
        code: med.code,
        type: 'STOCK_OUT',
        baseQuantityChange: -baseUnitsDeducted,
        batchNumber: med.batchNumber,
        expiryDate: med.expiryDate,
        reason: `Sales Invoice ${generateInvoiceNumber()}`,
        performedByName: req.user?.name || 'Pharmacy Staff',
        createdAt: new Date().toISOString()
      };
      localMovements.unshift(movementLog);

      if (getIsDBConnected()) {
        try {
          await StockMovement.create(movementLog);
        } catch (movErr) {
          console.warn('Could not save StockMovement to DB:', movErr);
        }
      }
    }

    // Persist updated stock & movements locally
    LocalStore.saveMedicines(localMedicines);
    LocalStore.saveStockMovements(localMovements);

    // Compute total discount & net total
    let finalDiscount = Number(discountAmount);
    if (discountPercentage > 0) {
      finalDiscount = (subtotal * Number(discountPercentage)) / 100;
    }
    const totalAmount = Math.max(0, subtotal - finalDiscount);

    const now = new Date();
    const invoiceNumber = generateInvoiceNumber();
    const billId = `bill-${Date.now()}`;

    const newBill = {
      id: billId,
      invoiceNumber,
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 8),
      items: processedBillItems,
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(finalDiscount * 100) / 100,
      discountPercentage: Number(discountPercentage) || 0,
      totalAmount: Math.round(totalAmount * 100) / 100,
      paymentMethod,
      createdByName: req.user?.name || 'Pharmacy Staff',
      createdByEmail: req.user?.email || 'staff@pharmacy.com',
      isOfflineCreated: !!isOfflineCreated,
      syncStatus: isOfflineCreated ? 'PENDING' : 'SYNCED',
      createdAt: now.toISOString()
    };

    // Save Bill to Local Store
    const localBills = LocalStore.getBills();
    localBills.unshift(newBill);
    LocalStore.saveBills(localBills);

    // Save to MongoDB if connected, else queue transaction for sync
    if (getIsDBConnected()) {
      try {
        await Bill.create(newBill);
        // Also sync stock to MongoDB using baseUnitsDeducted
        for (const item of processedBillItems) {
          await Medicine.findOneAndUpdate(
            { id: item.medicineId },
            { $inc: { quantity: -item.baseUnitsDeducted } }
          );
        }
      } catch (dbErr: any) {
        console.warn('⚠️ Could not save bill to MongoDB directly. Queuing for sync:', dbErr.message);
        newBill.syncStatus = 'PENDING';
        LocalStore.addSyncTransaction({
          id: `tx-${Date.now()}`,
          transactionId: `OFFLINE-CREATE_BILL-${newBill.id}`,
          operation: 'CREATE_BILL',
          payload: newBill,
          status: 'PENDING',
          createdAt: new Date().toISOString()
        });
      }
    } else {
      newBill.syncStatus = 'PENDING';
      LocalStore.addSyncTransaction({
        id: `tx-${Date.now()}`,
        transactionId: `OFFLINE-CREATE_BILL-${newBill.id}`,
        operation: 'CREATE_BILL',
        payload: newBill,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });
    }

    sendNotification('New Sale Completed', `Invoice ${invoiceNumber} created for ₹${newBill.totalAmount}`);

    return res.status(201).json({
      success: true,
      message: 'Bill created successfully.',
      bill: newBill
    });
  } catch (error: any) {
    console.error('Create Bill Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error creating bill.' });
  }
};

export const getBills = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, invoiceNumber } = req.query;
    let bills: any[] = [];

    if (getIsDBConnected()) {
      let query: any = {};
      if (invoiceNumber) query.invoiceNumber = new RegExp(invoiceNumber as string, 'i');
      if (startDate && endDate) {
        query.date = { $gte: startDate, $lte: endDate };
      }
      bills = await Bill.find(query).sort({ createdAt: -1 });
    }

    if (!bills.length) {
      bills = LocalStore.getBills();
      if (invoiceNumber) {
        const inv = (invoiceNumber as string).toLowerCase();
        bills = bills.filter(b => b.invoiceNumber.toLowerCase().includes(inv));
      }
      if (startDate && endDate) {
        bills = bills.filter(b => b.date >= startDate && b.date <= endDate);
      }
    }

    return res.json({ success: true, count: bills.length, bills });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getBillByInvoice = async (req: Request, res: Response) => {
  try {
    const { invoiceNumber } = req.params;
    let bill: any = null;

    if (getIsDBConnected()) {
      bill = await Bill.findOne({ invoiceNumber });
    }

    if (!bill) {
      const local = LocalStore.getBills();
      bill = local.find(b => b.invoiceNumber === invoiceNumber || b.id === invoiceNumber);
    }

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    return res.json({ success: true, bill });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
