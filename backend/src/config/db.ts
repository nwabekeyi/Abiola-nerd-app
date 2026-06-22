import mongoose from 'mongoose';
import { env } from './env.js';
export async function connectDb() {
  try {
    await mongoose.connect(env.mongoUri);
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
}
