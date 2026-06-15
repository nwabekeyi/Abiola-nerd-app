import { Request, Response } from 'express';
import { recomputeAnalytics } from '../services/analytics.js';

export async function getAnalyticsRoute(_req: Request, res: Response) {
  await recomputeAnalytics();
  res.json({ message: 'Analytics recomputed' });
}