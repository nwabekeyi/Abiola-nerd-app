import mongoose from 'mongoose';

const analyticsDaySchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  totalRegistrations: { type: Number, default: 0 },
  completedRegistrations: { type: Number, default: 0 },
  uncompletedRegistrations: { type: Number, default: 0 },
  totalWorkers: { type: Number, default: 0 },
  newWorkersToday: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  programmeCategories: [{ name: String, value: Number }],
  faculties: [{ name: String, value: Number }],
  hourlyDistribution: [{ hour: Number, count: Number }],
}, { timestamps: true });

export const AnalyticsDay = mongoose.model('AnalyticsDay', analyticsDaySchema);