import { Router } from 'express';
import { login } from '../controllers/authController.js';
import { loginSchema } from '../validators/adminSchemas.js';
import { validateBody } from '../validators/validate.js';

export const authRoutes = Router();

authRoutes.post('/login', validateBody(loginSchema), login);
