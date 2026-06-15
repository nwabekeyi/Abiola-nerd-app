import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';
import { RegistrationLink } from '../models/Link.js';
import { Registration } from '../models/Registration.js';
import { Setting } from '../models/Setting.js';
import { linkPdf } from '../services/pdf.js';
import { env } from '../config/env.js';

const passcodeGenerator = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);
const slugGenerator = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

export async function overview(_req: Request, res: Response) {
  const [links, activeLinks, revokedLinks, registrations, completed, uncompleted] = await Promise.all([
    RegistrationLink.countDocuments(),
    RegistrationLink.countDocuments({ isRevoked: false }),
    RegistrationLink.countDocuments({ isRevoked: true }),
    Registration.countDocuments(),
    Registration.countDocuments({ status: 'completed' }),
    Registration.countDocuments({ status: 'uncompleted' })
  ]);

  res.json({ links, activeLinks, revokedLinks, registrations, completed, uncompleted });
}

export async function createLink(req: Request, res: Response) {
  const passcode = req.body.passcode || passcodeGenerator();
  const slug = slugGenerator();
  const link = await RegistrationLink.create({
    workerFullName: req.body.workerFullName,
    slug,
    passcodeHash: await bcrypt.hash(passcode, 10)
  });

  res.status(201).json({ ...link.toObject(), url: `${env.appUrl}/register/${slug}`, passcode });
}

export async function listLinks(_req: Request, res: Response) {
  const links = await RegistrationLink.find().sort('-createdAt');
  res.json(links.map((link) => ({ ...link.toObject(), url: `${env.appUrl}/register/${link.slug}` })));
}

export async function setLinkRevocation(req: Request, res: Response) {
  const link = await RegistrationLink.findByIdAndUpdate(
    req.params.id,
    { isRevoked: req.body.isRevoked ?? true },
    { new: true }
  );

  if (!link) return res.status(404).json({ message: 'Worker link not found' });
  return res.json(link);
}

export async function downloadLinkPdf(req: Request, res: Response) {
  const passcode = req.body.passcode || passcodeGenerator();
  const link = await RegistrationLink.findById(req.params.id);

  if (!link) return res.status(404).json({ message: 'Worker link not found' });

  if (req.body.passcode) {
    link.passcodeHash = await bcrypt.hash(passcode, 10);
    await link.save();
  }

  const pdf = await linkPdf({
    workerFullName: link.workerFullName,
    link: `${env.appUrl}/register/${link.slug}`,
    passcode
  });

  res.setHeader('Content-Disposition', `attachment; filename="${link.slug}-credentials.pdf"`);
  return res.contentType('application/pdf').send(pdf);
}

export async function listRegistrations(req: Request, res: Response) {
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

  const registrations = await Registration.find(query).populate('link payment').sort('-createdAt');
  res.json(registrations);
}

export async function updateRegistrationStatus(req: Request, res: Response) {
  const registration = await Registration.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });

  if (!registration) return res.status(404).json({ message: 'Registration not found' });
  return res.json(registration);
}

export async function setRegistrationFee(req: Request, res: Response) {
  const setting = await Setting.findOneAndUpdate(
    { key: 'registrationFee' },
    { value: { amount: Number(req.body.amount), currency: 'NGN' } },
    { upsert: true, new: true }
  );

  res.json(setting);
}

export async function getRegistrationFee(_req: Request, res: Response) {
  const fee = await Setting.findOne({ key: 'registrationFee' });
  res.json(fee?.value || { amount: 0, currency: 'NGN' });
}
