import { Request, Response } from 'express';
import { recomputeAnalytics } from '../services/analytics.js';

export async function getAnalyticsRoute(_req: Request, res: Response) {
  try {
    await recomputeAnalytics();
    res.json({ message: 'Analytics recomputed' });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to recompute analytics' });
  }
}