import { Request, Response } from 'express';
import { LocalStore } from '../utils/localStorage';
import { getIsDBConnected } from '../config/db';
import Bill from '../models/Bill';
import Medicine from '../models/Medicine';

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const medicines = LocalStore.getMedicines();
    const bills = LocalStore.getBills();
    const syncQueue = LocalStore.getSyncQueue();

    const todaysBills = bills.filter((b: any) => b.date === todayStr);
    const todaysSales = todaysBills.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);

    const totalMedicines = medicines.length;
    const currentStockCount = medicines.reduce((sum: number, m: any) => sum + (m.quantity || 0), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let lowStockCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;

    medicines.forEach((m: any) => {
      const exp = new Date(m.expiryDate);
      exp.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (exp < today) {
        expiredCount++;
      } else if (diffDays <= 90) {
        expiringCount++;
      } else if (m.quantity <= (m.reorderLevel || 10)) {
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
    let bills = LocalStore.getBills();

    if (startDate && endDate) {
      bills = bills.filter((b: any) => b.date >= (startDate as string) && b.date <= (endDate as string));
    }

    const totalSales = bills.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);
    const totalBills = bills.length;
    const averageBillValue = totalBills > 0 ? totalSales / totalBills : 0;

    const paymentBreakdown = {
      CASH: bills.filter((b: any) => b.paymentMethod === 'CASH').reduce((sum: number, b: any) => sum + b.totalAmount, 0),
      UPI: bills.filter((b: any) => b.paymentMethod === 'UPI').reduce((sum: number, b: any) => sum + b.totalAmount, 0),
      CARD: bills.filter((b: any) => b.paymentMethod === 'CARD').reduce((sum: number, b: any) => sum + b.totalAmount, 0),
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
    const medicines = LocalStore.getMedicines();
    const totalItems = medicines.length;
    const totalQuantity = medicines.reduce((sum: number, m: any) => sum + m.quantity, 0);
    const totalInventoryValue = medicines.reduce((sum: number, m: any) => sum + (m.sellingPrice * m.quantity), 0);

    const lowStockItems = medicines.filter((m: any) => m.quantity <= (m.reorderLevel || 10));

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
    const medicines = LocalStore.getMedicines();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expired: any[] = [];
    const expiring30: any[] = [];
    const expiring60: any[] = [];
    const expiring90: any[] = [];

    medicines.forEach((m: any) => {
      const exp = new Date(m.expiryDate);
      exp.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (exp < today) {
        expired.push({ ...m, daysRemaining: diffDays, expiryStatus: 'EXPIRED' });
      } else if (diffDays <= 30) {
        expiring30.push({ ...m, daysRemaining: diffDays, expiryStatus: 'EXPIRING_30' });
      } else if (diffDays <= 60) {
        expiring60.push({ ...m, daysRemaining: diffDays, expiryStatus: 'EXPIRING_60' });
      } else if (diffDays <= 90) {
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
