import mongoose, { Schema, Document } from 'mongoose';

export interface IMedicine extends Document {
  id: string;
  name: string;
  genericName: string;
  category: string;
  manufacturer: string;
  batchNumber: string;
  expiryDate: string;
  mrp: number;
  sellingPrice: number;
  quantity: number;
  reorderLevel: number;
  barcode: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'EXPIRING' | 'EXPIRED' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const MedicineSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, index: true },
  genericName: { type: String, required: true, index: true },
  category: { type: String, required: true },
  manufacturer: { type: String, required: true },
  batchNumber: { type: String, required: true, index: true },
  expiryDate: { type: String, required: true, index: true },
  mrp: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 0 },
  reorderLevel: { type: Number, default: 10 },
  barcode: { type: String, required: true, index: true },
  status: { 
    type: String, 
    enum: ['IN_STOCK', 'LOW_STOCK', 'EXPIRING', 'EXPIRED', 'INACTIVE'],
    default: 'IN_STOCK'
  }
}, { timestamps: true });

export default mongoose.model<IMedicine>('Medicine', MedicineSchema);
