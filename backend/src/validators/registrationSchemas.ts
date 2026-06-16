import Joi from 'joi';

export const initializePaymentSchema = Joi.object({
  email: Joi.string().trim().email({ tlds: { allow: false } }).required()
});

const requiredString = Joi.string().trim().required();
const optionalMiddleName = Joi.string().trim().allow('').optional();
const title = Joi.string().valid('Prof.', 'Dr.', 'Mr.', 'Mrs.', 'Miss', 'Ms.', 'Honourable').required();
const email = Joi.string().trim().email({ tlds: { allow: false } }).required();

const personSchema = Joi.object({
  title,
  firstName: requiredString,
  middleName: optionalMiddleName,
  surname: requiredString,
  phoneNumber: requiredString,
  email
}).required();

export const registrationPayloadSchema = Joi.object({
  personal: Joi.object({
    title,
    firstName: requiredString,
    middleName: optionalMiddleName,
    surname: requiredString,
    sex: Joi.string().valid('Male', 'Female').required(),
    dateOfBirth: Joi.date().required(),
    maritalStatus: Joi.string().valid('Married', 'Single', 'Divorced').required(),
    ninNumber: Joi.string().trim().pattern(/^\d{11}$/).required().messages({
      'string.pattern.base': 'NIN number must be exactly 11 digits'
    })
  }).required(),
  contact: Joi.object({
    nationality: requiredString,
    stateOfOrigin: requiredString,
    lga: requiredString,
    residentialAddress: requiredString,
    townCity: requiredString,
    emailAddress: email,
    phoneNumber: requiredString
  }).required(),
  nextOfKin: Joi.object({
    name: requiredString,
    phoneNumber: requiredString,
    emailAddress: email
  }).required(),
  academic: Joi.object({
    institutionName: requiredString,
    faculty: requiredString,
    department: requiredString,
    programmeType: requiredString,
    matriculationNumber: requiredString,
    courseOfStudy: requiredString,
    projectTopic: requiredString,
    programmeCategory: requiredString
  }).required(),
  supervisor: personSchema,
  hod: personSchema
}).required();

export const workerRegistrationsSchema = Joi.object({
  passcode: Joi.string().required()
});
