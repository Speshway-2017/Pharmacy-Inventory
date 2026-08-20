import { LocalStore } from './localStorage';
import { getIsDBConnected } from '../config/db';
import Medicine from '../models/Medicine';
import Bill from '../models/Bill';
import StockMovement from '../models/StockMovement';
import Category from '../models/Category';
import PharmacySettings from '../models/PharmacySettings';

export const seedLocalDataToMongoDB = async (): Promise<void> => {
  if (!getIsDBConnected()) return;

  try {
    // 1. Seed Medicines from Local Store if missing in MongoDB
    const localMeds = LocalStore.getMedicines();
    let seededMedsCount = 0;
    for (const med of localMeds) {
      const cleanMed = { ...med };
      delete cleanMed._id;
      const existing = await Medicine.findOne({
        $or: [
          { id: cleanMed.id },
          { code: cleanMed.code }
        ]
      });
      if (!existing && cleanMed.name) {
        await Medicine.create(cleanMed);
        seededMedsCount++;
      }
    }
    if (seededMedsCount > 0) {
      console.log(`📦 Seeded ${seededMedsCount} local medicine records to MongoDB Cloud Database.`);
    }

    // 2. Seed Bills from Local Store if missing in MongoDB
    const localBills = LocalStore.getBills();
    let seededBillsCount = 0;
    for (const bill of localBills) {
      const cleanBill = { ...bill };
      delete cleanBill._id;
      const existing = await Bill.findOne({
        $or: [
          { id: cleanBill.id },
          { invoiceNumber: cleanBill.invoiceNumber }
        ]
      });
      if (!existing && cleanBill.invoiceNumber) {
        await Bill.create({ ...cleanBill, syncStatus: 'SYNCED' });
        seededBillsCount++;
      }
    }
    if (seededBillsCount > 0) {
      console.log(`🧾 Seeded ${seededBillsCount} local sales bill invoices to MongoDB Cloud Database.`);
    }

    // 3. Seed Stock Movements from Local Store if missing in MongoDB
    const localMovements = LocalStore.getStockMovements();
    for (const mov of localMovements) {
      const cleanMov = { ...mov };
      delete cleanMov._id;
      if (cleanMov.id) {
        const existing = await StockMovement.findOne({ id: cleanMov.id });
        if (!existing) {
          await StockMovement.create(cleanMov);
        }
      }
    }

    // 4. Seed Categories from Local Store if missing in MongoDB
    const localCategories = LocalStore.getCategories();
    for (const cat of localCategories) {
      const cleanCat = { ...cat };
      delete cleanCat._id;
      if (cleanCat.name) {
        const existing = await Category.findOne({ name: cleanCat.name });
        if (!existing) {
          await Category.create(cleanCat);
        }
      }
    }

    // 5. Seed Pharmacy Settings from Local Store if missing in MongoDB
    const localSettings = LocalStore.getSettings();
    if (localSettings && localSettings.pharmacyName) {
      const cleanSettings = { ...localSettings };
      delete cleanSettings._id;
      const existingSettings = await PharmacySettings.findOne();
      if (!existingSettings) {
        await PharmacySettings.create(cleanSettings);
        console.log(`⚙️ Seeded pharmacy settings to MongoDB Cloud Database.`);
      }
    }
  } catch (err: any) {
    console.error('⚠️ Error during local data seeding to MongoDB Cloud:', err.message);
  }
};
