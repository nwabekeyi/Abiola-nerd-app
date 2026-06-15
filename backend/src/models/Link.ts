import mongoose from 'mongoose';
const linkSchema = new mongoose.Schema({
  workerFullName: { type: String, required: true, index: true },
  slug: { type: String, required: true, unique: true },
  passcodeHash: { type: String, required: true },
  passcode: { type: String, required: true, select: false },
  isRevoked: { type: Boolean, default: false },
  registrationCount: { type: Number, default: 0 }
}, { timestamps: true });
export const RegistrationLink = mongoose.model('RegistrationLink', linkSchema);
