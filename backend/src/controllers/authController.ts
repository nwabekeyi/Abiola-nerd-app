import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Admin } from '../models/Admin.js';

export async function seedAdmin() {
  const existingAdmin = await Admin.findOne({ email: env.adminEmail });
  if (existingAdmin) return;

  await Admin.create({
    email: env.adminEmail,
    passwordHash: await bcrypt.hash(env.adminPassword, 10)
  });
}

export async function login(req: Request, res: Response) {
  const admin = await Admin.findOne({ email: req.body.email });

  if (!admin || !(await bcrypt.compare(req.body.password, admin.passwordHash))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  return res.json({ token: jwt.sign({ sub: admin.id }, env.jwtSecret, { expiresIn: '12h' }) });
}
