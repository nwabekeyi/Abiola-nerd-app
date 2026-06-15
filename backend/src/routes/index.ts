import { Router } from 'express';
import { adminRoutes } from './adminRoutes.js';
import { authRoutes } from './authRoutes.js';
import { publicRoutes } from './publicRoutes.js';

export const router = Router();

router.use(publicRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);