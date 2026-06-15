import { Router } from 'express';
import multer from 'multer';
import {
  getPublicLink,
  initializePayment,
  submitRegistration,
  workerRegistrations,
  verifyPaymentStatus
} from '../controllers/registrationController.js';
import { initializePaymentSchema, workerRegistrationsSchema } from '../validators/registrationSchemas.js';
import { validateBody } from '../validators/validate.js';
import { getRegistrationFee } from '../controllers/adminController.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

export const publicRoutes = Router();

publicRoutes.get('/settings/fee', getRegistrationFee);
publicRoutes.get('/links/:slug', getPublicLink);
publicRoutes.post('/links/:slug/payments', validateBody(initializePaymentSchema), initializePayment);
publicRoutes.get('/payments/verify', verifyPaymentStatus);
publicRoutes.post('/links/:slug/registrations', upload.any(), submitRegistration);
publicRoutes.post('/links/:slug/worker-registrations', validateBody(workerRegistrationsSchema), workerRegistrations);
