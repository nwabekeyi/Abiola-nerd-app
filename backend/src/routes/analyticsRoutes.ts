import { Router } from 'express';
import { getAnalytics } from '../services/analytics.js';

export const analyticsRoutes = Router();

analyticsRoutes.get('/analytics', async (_req, res) => {
  const data = await getAnalytics();
  res.json(data);
});
