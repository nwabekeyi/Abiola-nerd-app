import { Router } from 'express';
import {
  createLink,
  getRegistrationFee,
  listLinks,
  listRegistrations,
  overview,
  setLinkRevocation,
  setRegistrationFee,
  updateRegistrationStatus,
  resetLinkPasscode,
  getLinkPasscode
} from '../controllers/adminController.js';
import { getDailyAnalyticsRoute } from '../controllers/dailyAnalyticsController.js';
import { requireAdmin } from '../middleware/auth.js';
import {
  createLinkSchema,
  feeSchema,
  registrationStatusSchema,
  revokeLinkSchema
} from '../validators/adminSchemas.js';
import { validateBody } from '../validators/validate.js';

export const adminRoutes = Router();

adminRoutes.use(requireAdmin);
adminRoutes.get('/overview', overview);
adminRoutes.get('/links', listLinks);
adminRoutes.post('/links', validateBody(createLinkSchema), createLink);
adminRoutes.patch('/links/:id/revoke', validateBody(revokeLinkSchema), setLinkRevocation);
adminRoutes.get('/links/:id/passcode', getLinkPasscode);
adminRoutes.post('/links/:id/passcode/reset', resetLinkPasscode);
adminRoutes.get('/registrations', listRegistrations);
adminRoutes.patch('/registrations/:id/status', validateBody(registrationStatusSchema), updateRegistrationStatus);
adminRoutes.get('/settings/fee', getRegistrationFee);
adminRoutes.put('/settings/fee', validateBody(feeSchema), setRegistrationFee);
adminRoutes.get('/analytics/daily', getDailyAnalyticsRoute);
