import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;

export const connectDB = async (): Promise<boolean> => {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('YOUR_MONGODB_URI') || uri.includes('cluster.mongodb.net')) {
    console.log('ℹ️ MongoDB URI not configured or using template placeholder. Running in Local Storage Mode.');
    isConnected = false;
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('🟢 Connected to MongoDB Atlas Cloud Database successfully.');
    return true;
  } catch (error: any) {
    console.warn('⚠️ Could not connect to MongoDB Atlas:', error.message);
    console.log('🔄 Falling back to Local Persistent JSON Storage Mode.');
    isConnected = false;
    return false;
  }
};

export const getIsDBConnected = (): boolean => isConnected;
