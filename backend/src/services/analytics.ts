import mongoose from 'mongoose';
import { Analytics } from '../models/Analytics.js';
import { Registration } from '../models/Registration.js';
import { RegistrationLink } from '../models/Link.js';
import { Payment } from '../models/Payment.js';
import { startOfMonth, endOfMonth } from '../utils/date.js';

export async function recomputeAnalytics() {
  try {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [currentMonthRegistrations, currentMonthCompleted, currentMonthRevenue, totalWorkers, totalRegistrations, totalCompleted, totalRevenue] = await Promise.all([
      Registration.countDocuments({ createdAt: { $gte: monthStart, $lt: monthEnd } }),
      Registration.countDocuments({ status: 'completed', createdAt: { $gte: monthStart, $lt: monthEnd } }),
      Payment.aggregate([
        { $match: { status: 'success', createdAt: { $gte: monthStart, $lt: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      RegistrationLink.countDocuments(),
      Registration.countDocuments(),
      Registration.countDocuments({ status: 'completed' }),
      Payment.aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
    ]);

    await Analytics.findOneAndUpdate(
      { key: 'main' },
      {
        key: 'main',
        currentMonthRegistrations,
        currentMonthCompleted,
        currentMonthRevenue: currentMonthRevenue[0]?.total || 0,
        totalWorkers,
        totalRegistrations,
        totalCompleted,
        totalRevenue: totalRevenue[0]?.total || 0,
        lastUpdated: now,
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Failed to recompute analytics:', error);
  }
}

export async function getAnalytics() {
  const analytics = await Analytics.findOne({ key: 'main' });
  if (!analytics) {
    await recomputeAnalytics();
    return getAnalytics();
  }
  return {
    currentMonthRegistrations: analytics.currentMonthRegistrations,
    currentMonthCompleted: analytics.currentMonthCompleted,
    currentMonthRevenue: analytics.currentMonthRevenue,
    totalWorkers: analytics.totalWorkers,
    totalRegistrations: analytics.totalRegistrations,
    totalCompleted: analytics.totalCompleted,
    totalRevenue: analytics.totalRevenue,
    lastUpdated: analytics.lastUpdated,
  };
}
