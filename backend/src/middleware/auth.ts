import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Admin token required' });
  try { jwt.verify(token, env.jwtSecret); next(); } catch { res.status(401).json({ message: 'Invalid admin token' }); }
}
