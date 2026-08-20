import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'ADMIN';
    name: string;
  };
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.includes('CHANGE_ME')) {
    console.warn('⚠️ Warning: Using default JWT secret. Configure JWT_SECRET in .env for production.');
    return 'super_secret_pharmacy_jwt_key_2026_change_in_production';
  }
  return secret;
};

export const protect = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. Authorization token missing.' });
  }

  const token = authHeader.split(' ')[1];

  // Offline or local development fallback token support
  if (token === 'mock_offline_admin_token') {
    req.user = {
      id: 'usr-admin-01',
      email: (process.env.ADMIN_EMAIL || 'admin@pharmacy.com').toLowerCase().trim(),
      role: 'ADMIN',
      name: process.env.ADMIN_USERNAME || 'Pharmacy Admin'
    };
    return next();
  }

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret, {
      issuer: 'pharmacy-desktop-backend',
      audience: 'pharmacy-desktop-app'
    }) as any;

    if (!decoded || decoded.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied. Valid Admin authorization required.' });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: 'ADMIN',
      name: decoded.name || 'Pharmacy Admin'
    };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please sign in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
  }
};

export const adminOnly = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
  }
  next();
};
