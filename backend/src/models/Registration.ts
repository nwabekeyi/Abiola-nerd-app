import mongoose from 'mongoose';
const person = { title: String, firstName: String, middleName: String, surname: String, phoneNumber: String, email: String };
const registrationSchema = new mongoose.Schema({
  link: { type: mongoose.Schema.Types.ObjectId, ref: 'RegistrationLink', required: true, index: true },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, unique: true },
  status: { type: String, enum: ['completed','uncompleted'], default: 'uncompleted', index: true },
  personal: { title: String, firstName: String, middleName: String, surname: String, sex: String, dateOfBirth: Date, maritalStatus: String, ninNumber: String },
  contact: { nationality: String, stateOfOrigin: String, lga: String, residentialAddress: String, townCity: String, emailAddress: String, phoneNumber: String },
  nextOfKin: { name: String, phoneNumber: String, emailAddress: String },
  academic: { institutionName: String, faculty: String, department: String, programmeCategory: { type: String, default: 'UNDERGRADUATE' }, programmeType: String, matriculationNumber: String, courseOfStudy: String, projectTopic: String },
  supervisor: person, hod: person,
  documents: [{ kind: String, url: String, publicId: String, originalName: String }]
}, { timestamps: true });
export const Registration = mongoose.model('Registration', registrationSchema);
