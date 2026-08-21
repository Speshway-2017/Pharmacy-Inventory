import mongoose, { Schema, Document } from 'mongoose';

export interface IPharmacySettings extends Document {
  pharmacyName: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  invoicePrefix: string;
  invoiceFooter: string;
  printerType: 'THERMAL_80MM' | 'A4_STANDARD' | 'DEFAULT';
  printerName: string;
  autoPrintInvoice: boolean;
  lowStockThresholdDefault: number;
  expiryWarningDays: number;
}

const PharmacySettingsSchema: Schema = new Schema({
  pharmacyName: { type: String, default: 'Pharmacy Store' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  gstin: { type: String, default: '' },
  invoicePrefix: { type: String, default: 'INV' },
  invoiceFooter: { type: String, default: 'Thank you for your business!' },
  printerType: { type: String, default: 'THERMAL_80MM' },
  printerName: { type: String, default: 'Default Printer' },
  autoPrintInvoice: { type: Boolean, default: true },
  lowStockThresholdDefault: { type: Number, default: 10 },
  expiryWarningDays: { type: Number, default: 90 }
}, { timestamps: true });

export default mongoose.model<IPharmacySettings>('PharmacySettings', PharmacySettingsSchema);
