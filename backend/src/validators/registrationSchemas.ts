import Joi from 'joi';

export const initializePaymentSchema = Joi.object({
  email: Joi.string().email().required()
});

export const workerRegistrationsSchema = Joi.object({
  passcode: Joi.string().required()
});
