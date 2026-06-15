import mongoose from 'mongoose';
const paymentSchema = new mongoose.Schema({
  link: { type: mongoose.Schema.Types.ObjectId, ref: 'RegistrationLink', required: true },
  email: { type: String, required: true }, amount: { type: Number, required: true }, currency: { type: String, default: 'NGN' },
  reference: { type: String, unique: true, required: true }, status: { type: String, enum: ['initialized','success','failed'], default: 'initialized' },
  gatewayResponse: mongoose.Schema.Types.Mixed
}, { timestamps: true });
export const Payment = mongoose.model('Payment', paymentSchema);
