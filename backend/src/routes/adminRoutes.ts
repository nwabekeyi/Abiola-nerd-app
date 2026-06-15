import { Router } from 'express';
import {
  createLink,
  downloadLinkPdf,
  getRegistrationFee,
  listLinks,
  listRegistrations,
  overview,
  setLinkRevocation,
  setRegistrationFee,
  updateRegistrationStatus
} from '../controllers/adminController.js';
import { requireAdmin } from '../middleware/auth.js';
import {
  createLinkSchema,
  feeSchema,
  pdfSchema,
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
adminRoutes.post('/links/:id/pdf', validateBody(pdfSchema), downloadLinkPdf);
adminRoutes.get('/registrations', listRegistrations);
adminRoutes.patch('/registrations/:id/status', validateBody(registrationStatusSchema), updateRegistrationStatus);
adminRoutes.get('/settings/fee', getRegistrationFee);
adminRoutes.put('/settings/fee', validateBody(feeSchema), setRegistrationFee);
