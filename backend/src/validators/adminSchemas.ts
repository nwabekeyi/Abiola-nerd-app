import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(6).required()
});

export const createLinkSchema = Joi.object({
  workerFullName: Joi.string().trim().min(3).required()
});

export const revokeLinkSchema = Joi.object({
  isRevoked: Joi.boolean().optional()
});

export const pdfSchema = Joi.object({
  passcode: Joi.string().trim().min(4).optional().allow('')
});

export const registrationStatusSchema = Joi.object({
  status: Joi.string().valid('completed', 'uncompleted').required()
});

export const feeSchema = Joi.object({
  amount: Joi.number().min(0).required()
});
