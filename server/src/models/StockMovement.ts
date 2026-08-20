import mongoose, { Schema, Document } from 'mongoose';

export interface IStockMovement extends Document {
  id: string;
  medicineId: string;
  medicineName: string;
  code?: string;
  type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'EXPIRY';
  baseQuantityChange: number;
  batchNumber: string;
  expiryDate: string;
  reason?: string;
  performedByName?: string;
  createdAt: Date;
}

const StockMovementSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  medicineId: { type: String, required: true, index: true },
  medicineName: { type: String, required: true },
  code: { type: String, index: true },
  type: {
    type: String,
    enum: ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'EXPIRY'],
    required: true,
    index: true
  },
  baseQuantityChange: { type: Number, required: true },
  batchNumber: { type: String, required: true },
  expiryDate: { type: String, required: true },
  reason: { type: String, default: '' },
  performedByName: { type: String, default: 'Pharmacy Staff' }
}, { timestamps: true });

export default mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
