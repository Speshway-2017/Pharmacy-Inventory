import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

const CategorySchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  description: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

export default mongoose.model<ICategory>('Category', CategorySchema);
