import mongoose, { Schema, Document } from 'mongoose';

export interface ISyncLog extends Document {
  transactionId: string;
  operation: string;
  payload: any;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  errorMessage?: string;
  processedAt: Date;
}

const SyncLogSchema: Schema = new Schema({
  transactionId: { type: String, required: true, unique: true, index: true },
  operation: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['PENDING', 'SYNCING', 'SYNCED', 'FAILED'], default: 'SYNCED' },
  errorMessage: { type: String },
  processedAt: { type: Date, default: Date.now }
});

export default mongoose.model<ISyncLog>('SyncLog', SyncLogSchema);
