import { Request, Response } from 'express';
import { LocalStore } from '../utils/localStorage';
import { getIsDBConnected } from '../config/db';
import Bill from '../models/Bill';
import Medicine from '../models/Medicine';

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    let medicines: any[] = [];
    let bills: any[] = [];

    if (getIsDBConnected()) {
      medicines = await Medicine.find().lean();
      bills = await Bill.find().sort({ createdAt: -1 }).lean();
    }

    if (!medicines || medicines.length === 0) {
      medicines = LocalStore.getMedicines();
    }
    if (!bills || bills.length === 0) {
      bills = LocalStore.getBills();
    }

    const syncQueue = LocalStore.getSyncQueue();

    const todaysBills = bills.filter((b: any) => b.date === todayStr);
    const todaysSales = todaysBills.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);

    const totalMedicines = medicines.length;
    const currentStockCount = medicines.reduce((sum: number, m: any) => sum + (Number(m.quantity) || 0), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let lowStockCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;

    medicines.forEach((m: any) => {
      const expDateStr = m.expiryDate || '';
      const exp = new Date(expDateStr);
      exp.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const qty = Number(m.quantity) || 0;
      const reorder = Number(m.reorderLevel) || 10;

      if (expDateStr && exp < today) {
        expiredCount++;
      } else if (expDateStr && diffDays <= 90) {
        expiringCount++;
      } else if (qty <= reorder) {
        lowStockCount++;
      }
    });

    const recentBills = bills.slice(0, 5);

    return res.json({
      success: true,
      summary: {
        todaysSales: Math.round(todaysSales * 100) / 100,
        todaysBillCount: todaysBills.length,
        totalMedicines,
        currentStockCount,
        lowStockCount,
        expiringCount,
        expiredCount,
        recentBills,
        isOnline: getIsDBConnected(),
        pendingSyncCount: syncQueue.filter((q: any) => q.status === 'PENDING').length
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSalesReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    let bills: any[] = [];

    if (getIsDBConnected()) {
      let query: any = {};
      if (startDate && endDate) {
        query.date = { $gte: startDate, $lte: endDate };
      }
      bills = await Bill.find(query).sort({ createdAt: -1 }).lean();
    }

    if (!bills || bills.length === 0) {
      bills = LocalStore.getBills();
      if (startDate && endDate) {
        bills = bills.filter((b: any) => b.date >= (startDate as string) && b.date <= (endDate as string));
      }
    }

    const totalSales = bills.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);
    const totalBills = bills.length;
    const averageBillValue = totalBills > 0 ? totalSales / totalBills : 0;

    const paymentBreakdown = {
      CASH: bills.filter((b: any) => b.paymentMethod === 'CASH').reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0),
      UPI: bills.filter((b: any) => b.paymentMethod === 'UPI').reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0),
      CARD: bills.filter((b: any) => b.paymentMethod === 'CARD').reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0),
    };

    return res.json({
      success: true,
      report: {
        startDate: startDate || 'All time',
        endDate: endDate || 'All time',
        totalSales: Math.round(totalSales * 100) / 100,
        totalBills,
        averageBillValue: Math.round(averageBillValue * 100) / 100,
        paymentBreakdown,
        bills
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getStockReport = async (req: Request, res: Response) => {
  try {
    let medicines: any[] = [];
    if (getIsDBConnected()) {
      medicines = await Medicine.find().sort({ name: 1 }).lean();
    }
    if (!medicines || medicines.length === 0) {
      medicines = LocalStore.getMedicines();
    }

    const totalItems = medicines.length;
    const totalQuantity = medicines.reduce((sum: number, m: any) => sum + (Number(m.quantity) || 0), 0);
    const totalInventoryValue = medicines.reduce((sum: number, m: any) => sum + ((Number(m.sellingPrice) || 0) * (Number(m.quantity) || 0)), 0);

    const lowStockItems = medicines.filter((m: any) => (Number(m.quantity) || 0) <= (Number(m.reorderLevel) || 10));

    return res.json({
      success: true,
      report: {
        totalItems,
        totalQuantity,
        totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
        lowStockItemsCount: lowStockItems.length,
        medicines
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getExpiryReport = async (req: Request, res: Response) => {
  try {
    let medicines: any[] = [];
    if (getIsDBConnected()) {
      medicines = await Medicine.find().sort({ name: 1 }).lean();
    }
    if (!medicines || medicines.length === 0) {
      medicines = LocalStore.getMedicines();
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expired: any[] = [];
    const expiring30: any[] = [];
    const expiring60: any[] = [];
    const expiring90: any[] = [];

    medicines.forEach((m: any) => {
      const expDateStr = m.expiryDate || '';
      const exp = new Date(expDateStr);
      exp.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (expDateStr && exp < today) {
        expired.push({ ...m, daysRemaining: diffDays, expiryStatus: 'EXPIRED' });
      } else if (expDateStr && diffDays <= 30) {
        expiring30.push({ ...m, daysRemaining: diffDays, expiryStatus: 'EXPIRING_30' });
      } else if (expDateStr && diffDays <= 60) {
        expiring60.push({ ...m, daysRemaining: diffDays, expiryStatus: 'EXPIRING_60' });
      } else if (expDateStr && diffDays <= 90) {
        expiring90.push({ ...m, daysRemaining: diffDays, expiryStatus: 'EXPIRING_90' });
      }
    });

    return res.json({
      success: true,
      report: {
        expiredCount: expired.length,
        expiring30Count: expiring30.length,
        expiring60Count: expiring60.length,
        expiring90Count: expiring90.length,
        expired,
        expiring30,
        expiring60,
        expiring90
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
