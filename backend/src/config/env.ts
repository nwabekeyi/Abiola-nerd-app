import dotenv from 'dotenv';
dotenv.config();
export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/nerd_registration',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me',
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@nerd.local',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin12345',
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY ?? '',
  cloudinaryUrl: process.env.CLOUDINARY_URL ?? ''
};
