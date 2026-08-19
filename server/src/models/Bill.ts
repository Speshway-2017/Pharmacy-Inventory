import mongoose, { Schema, Document } from 'mongoose';

export interface IBillItem {
  medicineId: string;
  name: string;
  genericName: string;
  batchNumber: string;
  expiryDate: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface IBill extends Document {
  id: string;
  invoiceNumber: string;
  date: string;
  time: string;
  items: IBillItem[];
  subtotal: number;
  discountAmount: number;
  discountPercentage: number;
  totalAmount: number;
  paymentMethod: 'CASH' | 'UPI' | 'CARD';
  createdByName: string;
  createdByEmail: string;
  isOfflineCreated: boolean;
  syncStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  createdAt: Date;
}

const BillItemSchema = new Schema({
  medicineId: { type: String, required: true },
  name: { type: String, required: true },
  genericName: { type: String, required: true },
  batchNumber: { type: String, required: true },
  expiryDate: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  totalPrice: { type: Number, required: true }
});

const BillSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  invoiceNumber: { type: String, required: true, unique: true, index: true },
  date: { type: String, required: true, index: true },
  time: { type: String, required: true },
  items: [BillItemSchema],
  subtotal: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  discountPercentage: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['CASH', 'UPI', 'CARD'], required: true },
  createdByName: { type: String, required: true },
  createdByEmail: { type: String, required: true },
  isOfflineCreated: { type: Boolean, default: false },
  syncStatus: { type: String, enum: ['PENDING', 'SYNCING', 'SYNCED', 'FAILED'], default: 'SYNCED' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IBill>('Bill', BillSchema);
