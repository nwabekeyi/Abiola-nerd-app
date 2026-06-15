import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';

export function validateBody(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });

    if (error) {
      return res.status(422).json({
        message: 'Validation failed',
        errors: error.details.map((detail) => detail.message)
      });
    }

    req.body = value;
    return next();
  };
}
