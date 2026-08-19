import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { connectDB } from './config/db';
import { initAdminAccount } from './controllers/authController';

import authRoutes from './routes/authRoutes';
import medicineRoutes from './routes/medicineRoutes';
import billRoutes from './routes/billRoutes';
import reportRoutes from './routes/reportRoutes';
import syncRoutes from './routes/syncRoutes';
import settingsRoutes from './routes/settingsRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security: Disable X-Powered-By header
app.disable('x-powered-by');

// Security: Apply Helmet security headers
app.use(helmet({
  contentSecurityPolicy: false, // Electron compatibility
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration: Allow Localhost, Electron file://, and Local Network LAN IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
const lanIpRegex = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Electron file://, or curl)
    if (!origin || origin.startsWith('file://') || lanIpRegex.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security: Request size limits to prevent payload abuse
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Security: Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 500, // Limit each IP to 500 requests per window for LAN counter operations
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this client. Please try again later.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 15, // Limit to 15 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many failed login attempts. Please try again after 15 minutes.' }
});

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/login', loginLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/settings', settingsRoutes);

// Healthcheck Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Pharmacy Desktop Backend API'
  });
});

// Security: Centralized Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server Error:', err.message || err);
  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json({
    success: false,
    message: isDev ? err.message : 'An internal server error occurred. Please contact system administrator.'
  });
});

// Utility to get local network IP addresses
function getLocalNetworkIps(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

// Start Server & Bind to 0.0.0.0 for LAN Network Access
const startServer = async () => {
  await connectDB();
  await initAdminAccount();

  const portNum = Number(PORT);
  app.listen(portNum, '0.0.0.0', () => {
    const localIps = getLocalNetworkIps();
    console.log(`🚀 Secure Pharmacy Backend API running on port ${portNum}`);
    console.log(`📡 Local API URL: http://localhost:${portNum}/api`);
    if (localIps.length > 0) {
      console.log(`🌐 Network LAN API URLs (Accessible from any device on same Wi-Fi/Network):`);
      localIps.forEach(ip => {
        console.log(`   - http://${ip}:${portNum}/api`);
      });
      console.log(`💻 Frontend LAN Network Access:`);
      localIps.forEach(ip => {
        console.log(`   - http://${ip}:5173`);
      });
    }
  });
};

startServer();
