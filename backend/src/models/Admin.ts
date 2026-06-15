import mongoose from 'mongoose';
const adminSchema = new mongoose.Schema({ email: { type: String, unique: true }, passwordHash: String }, { timestamps: true });
export const Admin = mongoose.model('Admin', adminSchema);
