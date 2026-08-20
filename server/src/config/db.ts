import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';

// Always load from the SINGLE root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Disable Mongoose command buffering to prevent 10,000ms timeout hangs when offline/unreachable
mongoose.set('bufferCommands', false);

let isConnected = false;

export const connectDB = async (): Promise<boolean> => {
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return true;
  }

  let uri = process.env.MONGODB_URI;

  if (!uri || uri.includes('YOUR_MONGODB_URI') || uri.includes('user:password')) {
    console.log('ℹ️ MongoDB URI not configured or using default placeholder. Running in Local Storage Mode.');
    isConnected = false;
    return false;
  }

  // Auto clean angle brackets around password if present
  if (uri.includes('<') && uri.includes('>')) {
    uri = uri.replace(/<([^>]+)>/g, '$1');
  }

  // Set Google & Cloudflare Public DNS servers to fix Windows SRV DNS query lookup refusals
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (dnsErr: any) {
    // Fallback silently if custom DNS setting is unsupported
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

export const getIsDBConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};
