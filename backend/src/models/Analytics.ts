import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  currentMonthRegistrations: { type: Number, default: 0 },
  currentMonthCompleted: { type: Number, default: 0 },
  currentMonthRevenue: { type: Number, default: 0 },
  totalWorkers: { type: Number, default: 0 },
  totalRegistrations: { type: Number, default: 0 },
  totalCompleted: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true });

export const Analytics = mongoose.model('Analytics', analyticsSchema);
