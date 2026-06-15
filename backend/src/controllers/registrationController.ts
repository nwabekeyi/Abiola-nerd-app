import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';
import { env } from '../config/env.js';
import { RegistrationLink } from '../models/Link.js';
import { Payment } from '../models/Payment.js';
import { Registration } from '../models/Registration.js';
import { Setting } from '../models/Setting.js';
import { uploadDocument } from '../services/cloudinary.js';
import { initializePaystack, verifyPaystack } from '../services/paystack.js';

const referenceGenerator = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 18);

export async function getPublicLink(req: Request, res: Response) {
  const link = await RegistrationLink.findOne({ slug: req.params.slug });

  if (!link) return res.status(404).json({ message: 'Worker link not found' });
  return res.json({ id: link.id, workerFullName: link.workerFullName, isRevoked: link.isRevoked });
}

export async function initializePayment(req: Request, res: Response) {
  const link = await RegistrationLink.findOne({ slug: req.params.slug, isRevoked: false });

  if (!link) return res.status(400).json({ message: 'Registration link is revoked or invalid' });

  const fee = await Setting.findOne({ key: 'registrationFee' });
  const amount = Number(fee?.value?.amount || 0);
  const reference = referenceGenerator();

  await Payment.create({ link: link.id, email: req.body.email, amount, reference });

  const payment = await initializePaystack(
    req.body.email,
    amount,
    reference,
    `${env.appUrl}/register/${link.slug}/payment`
  );

  return res.json({ reference, ...payment });
}

export async function submitRegistration(req: Request, res: Response) {
  const session = await mongoose.startSession();

  try {
    let createdRegistration: unknown;

    await session.withTransaction(async () => {
      const link = await RegistrationLink.findOne({ slug: req.params.slug, isRevoked: false }).session(session);
      if (!link) throw new Error('Registration link is revoked or invalid');

      const payment = await Payment.findOne({ reference: req.body.reference, link: link.id }).session(session);
      if (!payment) throw new Error('Payment not found for this worker link');

      const verifiedPayment = await verifyPaystack(payment.reference);
      if (verifiedPayment.status !== 'success') throw new Error('Payment was not successful');

      payment.status = 'success';
      payment.gatewayResponse = verifiedPayment;
      await payment.save({ session });

      const documents = [];
      for (const file of (req.files as Express.Multer.File[]) || []) {
        const uploaded = await uploadDocument(file, `nerd/${link.slug}`);
        documents.push({
          kind: file.fieldname,
          url: uploaded.url,
          publicId: uploaded.publicId,
          originalName: file.originalname
        });
      }

      const payload = JSON.parse(req.body.payload);
      const [registration] = await Registration.create(
        [{ link: link.id, payment: payment.id, ...payload, documents }],
        { session }
      );

      link.registrationCount += 1;
      await link.save({ session });
      createdRegistration = registration;
    });

    return res.status(201).json(createdRegistration);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Registration failed' });
  } finally {
    await session.endSession();
  }
}

export async function workerRegistrations(req: Request, res: Response) {
  const link = await RegistrationLink.findOne({ slug: req.params.slug });

  if (!link || !(await bcrypt.compare(req.body.passcode, link.passcodeHash))) {
    return res.status(401).json({ message: 'Invalid passcode' });
  }

  const registrations = await Registration.find({ link: link.id }).select('-documents.publicId').sort('-createdAt');
  return res.json(registrations);
}
