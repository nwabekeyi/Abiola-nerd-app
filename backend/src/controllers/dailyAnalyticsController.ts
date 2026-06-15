import { Request, Response } from 'express';
import { getDailyAnalytics } from '../services/dailyAnalytics.js';

export async function getDailyAnalyticsRoute(_req: Request, res: Response) {
  try {
    const data = await getDailyAnalytics();
    res.json(data);
  } catch {
    res.status(500).json({ message: 'Failed to load analytics' });
  }
}
