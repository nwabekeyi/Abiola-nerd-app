import mongoose from 'mongoose';
import { Registration } from '../models/Registration.js';
import { RegistrationLink } from '../models/Link.js';
import { Payment } from '../models/Payment.js';

export async function getDailyAnalytics() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    dailyRegistrations,
    dailyWorkers,
    dailyPayments,
    paymentStatusDist,
  ] = await Promise.all([
    Registration.aggregate([
      {
        $match: {
          createdAt: { $gte: monthStart, $lt: monthEnd }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    RegistrationLink.aggregate([
      {
        $match: {
          createdAt: { $gte: monthStart, $lt: monthEnd }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Payment.aggregate([
      {
        $match: {
          status: 'success',
          createdAt: { $gte: monthStart, $lt: monthEnd }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: monthStart, $lt: monthEnd }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const dates: string[] = [];
  const day = new Date(monthStart);
  while (day < monthEnd) {
    dates.push(day.toISOString().split('T')[0]);
    day.setDate(day.getDate() + 1);
  }

  const regMap: Record<string, number> = {};
  for (const item of dailyRegistrations) {
    regMap[item._id] = item.count;
  }

  const workerMap: Record<string, number> = {};
  for (const item of dailyWorkers) {
    workerMap[item._id] = item.count;
  }

  const payMap: Record<string, number> = {};
  for (const item of dailyPayments) {
    payMap[item._id] = item.amount || 0;
  }

  const enrollmentsSeries = dates.map(date => ({
    date,
    enrollments: regMap[date] || 0,
    workers: workerMap[date] || 0,
    paymentAmount: payMap[date] || 0,
  }));

  const statusMap: Record<string, number> = {};
  for (const item of paymentStatusDist) {
    statusMap[item._id] = item.count;
  }

  const paymentStatusData = Object.entries(statusMap).map(([name, value]) => ({
    name,
    value,
  }));

  return {
    month: `${monthStart.toLocaleString('default', { month: 'long' })} ${monthStart.getFullYear()}`,
    enrollmentsSeries,
    paymentStatusData,
    totals: {
      enrollments: enrollmentsSeries.reduce((sum, d) => sum + d.enrollments, 0),
      workers: enrollmentsSeries.reduce((sum, d) => sum + d.workers, 0),
      revenue: enrollmentsSeries.reduce((sum, d) => sum + d.paymentAmount, 0),
    }
  };
}
