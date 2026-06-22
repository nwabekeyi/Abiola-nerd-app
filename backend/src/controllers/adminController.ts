import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';
import { RegistrationLink } from '../models/Link.js';
import { Payment } from '../models/Payment.js';
import { Registration } from '../models/Registration.js';
import { Setting } from '../models/Setting.js';
import { env } from '../config/env.js';
import { recomputeAnalytics } from '../services/analytics.js';

const passcodeGenerator = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);
const slugGenerator = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

export async function overview(_req: Request, res: Response) {
  try {
    const [
      links,
      activeLinks,
      revokedLinks,
      registrations,
      completed,
      uncompleted,
      totalRevenueResult,
      totalPayments
    ] = await Promise.all([
      RegistrationLink.countDocuments(),
      RegistrationLink.countDocuments({ isRevoked: false }),
      RegistrationLink.countDocuments({ isRevoked: true }),
      Registration.countDocuments(),
      Registration.countDocuments({ status: 'completed' }),
      Registration.countDocuments({ status: 'uncompleted' }),
      Payment.aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.countDocuments({ status: 'success' })
    ]);

    res.json({
      links,
      activeLinks,
      revokedLinks,
      registrations,
      completed,
      uncompleted,
      totalRevenue: totalRevenueResult[0]?.total ?? 0,
      totalPayments,
      completionRate: registrations > 0 ? Math.round(((completed || 0) / registrations) * 100) : 0,
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to load overview' });
  }
}

export async function createLink(req: Request, res: Response) {
  try {
    const passcode = passcodeGenerator();
    const slug = slugGenerator();
    const passcodeHash = await bcrypt.hash(passcode, 10);
    const link = await RegistrationLink.create({
      workerFullName: req.body.workerFullName,
      slug,
      passcodeHash,
      passcode
    });

    res.status(201).json({ ...link.toObject(), url: `${env.appUrl}/register/${slug}`, passcode });
    recomputeAnalytics().catch(() => {});
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to create link' });
  }
}

export async function listLinks(req: Request, res: Response) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim();

    const query: Record<string, unknown> = {};
    if (search) {
      query.workerFullName = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    const [items, total] = await Promise.all([
      RegistrationLink.find(query).sort('-createdAt').skip(skip).limit(limit),
      RegistrationLink.countDocuments(query)
    ]);

    res.json({
      items: items.map((link) => ({ ...link.toObject(), url: `${env.appUrl}/register/${link.slug}` })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to list links' });
  }
}

export async function setLinkRevocation(req: Request, res: Response) {
  try {
    const link = await RegistrationLink.findByIdAndUpdate(
      req.params.id,
      { isRevoked: req.body.isRevoked ?? true },
      { new: true }
    );

    if (!link) return res.status(404).json({ message: 'Worker link not found' });
    return res.json(link);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to update link revocation' });
  }
}

export async function resetLinkPasscode(_req: Request, res: Response) {
  try {
    const link = await RegistrationLink.findById(_req.params.id);

    if (!link) return res.status(404).json({ message: 'Worker link not found' });

    const passcode = passcodeGenerator();
    link.passcodeHash = await bcrypt.hash(passcode, 10);
    link.passcode = passcode;
    await link.save();

    res.json({ passcode });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to reset passcode' });
  }
}

export async function getLinkPasscode(_req: Request, res: Response) {
  try {
    const link = await RegistrationLink.findById(_req.params.id).select('passcode');

    if (!link) return res.status(404).json({ message: 'Worker link not found' });

    res.json({ passcode: link.passcode });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to get passcode' });
  }
}

export async function listRegistrations(req: Request, res: Response) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (req.query.link) query.link = req.query.link;
    if (req.query.status) query.status = req.query.status;
    if (req.query.search) {
      const search = new RegExp(String(req.query.search), 'i');
      query.$or = [
        { 'personal.firstName': search },
        { 'personal.surname': search },
        { 'contact.emailAddress': search },
        { 'academic.matriculationNumber': search }
      ];
    }

    const [items, total] = await Promise.all([
      Registration.find(query).populate('link payment').sort('-createdAt').skip(skip).limit(limit),
      Registration.countDocuments(query)
    ]);

    res.json({
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to list registrations' });
  }
}

export async function updateRegistrationStatus(req: Request, res: Response) {
  try {
    const registration = await Registration.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });

    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    recomputeAnalytics().catch(() => {});
    return res.json(registration);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to update registration status' });
  }
}

export async function setRegistrationFee(req: Request, res: Response) {
  try {
    const setting = await Setting.findOneAndUpdate(
      { key: 'registrationFee' },
      { value: { amount: Number(req.body.amount), currency: 'NGN' } },
      { upsert: true, new: true }
    );

    res.json(setting);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to set registration fee' });
  }
}

export async function getRegistrationFee(_req: Request, res: Response) {
  try {
    const fee = await Setting.findOne({ key: 'registrationFee' });
    res.json(fee?.value || { amount: 0, currency: 'NGN' });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to get registration fee' });
  }
}
