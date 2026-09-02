import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';

import fs from 'fs';

// Load .env from workspace root, current working directory, or packaged Electron resources directory
const envPaths = [
  path.resolve(__dirname, '../../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve((process as any).resourcesPath || '', '.env')
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

// Set Google & Cloudflare Public DNS servers to fix Windows SRV DNS query lookup refusals globally
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (dnsErr: any) {
  // Fallback silently if custom DNS setting is unsupported
}

// Disable Mongoose command buffering to prevent 10,000ms timeout hangs when offline/unreachable
mongoose.set('bufferCommands', false);

let isConnected = false;
let isConnecting = false;

export const connectDB = async (): Promise<boolean> => {
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return true;
  }

  if (isConnecting) {
    return false;
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

  try {
    isConnecting = true;
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    } catch (dnsErr: any) {}

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    isConnecting = false;
    console.log('🟢 Connected to MongoDB Atlas Cloud Database successfully.');
    return true;
  } catch (error: any) {
    isConnecting = false;
    console.warn('⚠️ Could not connect to MongoDB Atlas:', error.message);
    console.log('🔄 Falling back to Local Persistent JSON Storage Mode.');
    isConnected = false;
    return false;
  }
};

export const getIsDBConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

// Automatic background reconnect timer: retry database connection every 15 seconds if disconnected
setInterval(async () => {
  if (mongoose.connection.readyState !== 1 && !isConnecting && process.env.MONGODB_URI) {
    await connectDB();
  }
}, 15000);
