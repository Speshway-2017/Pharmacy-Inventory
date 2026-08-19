import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
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

// Security: Restricted CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Electron file://, or curl)
    if (!origin || origin.startsWith('file://') || allowedOrigins.includes(origin)) {
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
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this client. Please try again later.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // Limit to 10 login attempts per window to prevent brute force
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

// Security: Centralized Error Handler (Hides stack traces and sensitive error details)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server Error:', err.message || err);
  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json({
    success: false,
    message: isDev ? err.message : 'An internal server error occurred. Please contact system administrator.'
  });
});

// Start Server & Initialize Single Admin
const startServer = async () => {
  await connectDB();
  await initAdminAccount();

  app.listen(PORT, () => {
    console.log(`🚀 Secure Pharmacy Backend API running on port ${PORT}`);
    console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
  });
};

startServer();
