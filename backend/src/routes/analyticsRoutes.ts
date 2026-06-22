import { Router } from 'express';
import { getAnalytics } from '../services/analytics.js';

export const analyticsRoutes = Router();

analyticsRoutes.get('/analytics', async (_req, res) => {
  try {
    const data = await getAnalytics();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to load analytics' });
  }
});
