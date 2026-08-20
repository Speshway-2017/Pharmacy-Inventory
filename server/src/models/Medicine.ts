import mongoose, { Schema, Document } from 'mongoose';

export interface IMedicine extends Document {
  id: string;
  code?: string;
  name: string;
  genericName: string;
  category: string;
  manufacturer: string;
  strength?: string;
  dosageForm?: string;
  packageType?: string;
  unitsPerPackage?: number;
  sellingMode?: 'FULL_PACKAGE_AND_LOOSE' | 'FULL_PACKAGE_ONLY';
  looseUnitName?: string;
  batchNumber: string;
  expiryDate: string;
  mrp: number;
  sellingPrice: number;
  quantity: number;
  reorderLevel: number;
  barcode: string;
  rack?: string;
  row?: string;
  column?: string;
  shelfBin?: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'EXPIRING' | 'EXPIRED' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const MedicineSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  code: { type: String, index: true },
  name: { type: String, required: true, index: true },
  genericName: { type: String, required: true, index: true },
  category: { type: String, required: true },
  manufacturer: { type: String, required: true },
  strength: { type: String, default: '' },
  dosageForm: { type: String, default: 'Tablet' },
  packageType: { type: String, default: 'Strip' },
  unitsPerPackage: { type: Number, default: 1, min: 1 },
  sellingMode: {
    type: String,
    enum: ['FULL_PACKAGE_AND_LOOSE', 'FULL_PACKAGE_ONLY'],
    default: 'FULL_PACKAGE_ONLY'
  },
  looseUnitName: { type: String, default: 'Tablet' },
  batchNumber: { type: String, required: true, index: true },
  expiryDate: { type: String, required: true, index: true },
  mrp: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 0 },
  reorderLevel: { type: Number, default: 10 },
  barcode: { type: String, required: true, index: true },
  rack: { type: String, default: '' },
  row: { type: String, default: '' },
  column: { type: String, default: '' },
  shelfBin: { type: String, default: '' },
  status: {
    type: String,
    enum: ['IN_STOCK', 'LOW_STOCK', 'EXPIRING', 'EXPIRED', 'INACTIVE'],
    default: 'IN_STOCK'
  }
}, { timestamps: true });

export default mongoose.model<IMedicine>('Medicine', MedicineSchema);
