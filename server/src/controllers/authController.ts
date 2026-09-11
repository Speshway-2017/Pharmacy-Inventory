import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { LocalStore } from '../utils/localStorage';
import User from '../models/User';
import { getIsDBConnected } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

const getJwtSecret = (): string => {
  return process.env.JWT_SECRET || 'super_secret_pharmacy_jwt_key_2026_change_in_production';
};

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

export const initAdminAccount = async () => {
  const adminName = process.env.ADMIN_USERNAME || 'Pharmacy Admin';
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@pharmacy.com').toLowerCase().trim();
  const rawPassword = process.env.ADMIN_PASSWORD || 'admin123';

  try {
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const adminObj = {
      id: 'usr-admin-01',
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: 'ADMIN' as const,
      createdAt: new Date().toISOString()
    };

    const localUsers = LocalStore.getUsers();
    const localAdminIndex = localUsers.findIndex((u: any) => u.email?.toLowerCase() === adminEmail || u.role === 'ADMIN');

    if (localAdminIndex === -1) {
      localUsers.unshift(adminObj);
    } else {
      localUsers[localAdminIndex] = { ...localUsers[localAdminIndex], ...adminObj };
    }
    LocalStore.saveUsers(localUsers);

    if (getIsDBConnected()) {
      await User.findOneAndUpdate({ email: adminEmail }, adminObj, { upsert: true, new: true });
      console.log(`✅ Admin account synced to MongoDB Cloud Database [${adminEmail}]`);
    } else {
      console.log(`ℹ️ Admin account initialized locally [${adminEmail}]. Will sync when MongoDB connects.`);
    }
  } catch (err: any) {
    console.error('⚠️ Admin startup initialization error:', err.message);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;
    const inputIdentifier = (email || username || '').toString().toLowerCase().trim();

    if (!inputIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    let foundUser: any = null;

    if (getIsDBConnected()) {
      foundUser = await User.findOne({ email: inputIdentifier });
    }

    if (!foundUser) {
      const localUsers = LocalStore.getUsers();
      foundUser = localUsers.find((u: any) =>
        u.email?.toLowerCase() === inputIdentifier ||
        u.name?.toLowerCase() === inputIdentifier ||
        inputIdentifier === 'admin'
      );
    }

    if (!foundUser) {
      // Generic error response to prevent user enumeration
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Single role enforcement
    if (foundUser.role !== 'ADMIN') {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Secure bcrypt password verification
    let isMatch = false;
    if (foundUser.passwordHash) {
      isMatch = await bcrypt.compare(password.toString(), foundUser.passwordHash);
    }

    if (!isMatch) {
      // Generic error response to prevent password guessing leak
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const secret = getJwtSecret();
    const token = jwt.sign(
      {
        id: foundUser.id || foundUser._id,
        email: foundUser.email,
        role: 'ADMIN',
        name: foundUser.name
      },
      secret,
      {
        expiresIn: (JWT_EXPIRES_IN as any),
        issuer: 'pharmacy-desktop-backend',
        audience: 'pharmacy-desktop-app'
      }
    );

    return res.json({
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: foundUser.id || foundUser._id,
        name: foundUser.name,
        email: foundUser.email,
        role: 'ADMIN'
      }
    });
  } catch (error: any) {
    console.error('Login error:', error.message);
    return res.status(500).json({ success: false, message: 'An error occurred during authentication.' });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  return res.json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: 'ADMIN'
    }
  });
};

export const logout = async (req: Request, res: Response) => {
  return res.json({ success: true, message: 'Session closed successfully.' });
};
