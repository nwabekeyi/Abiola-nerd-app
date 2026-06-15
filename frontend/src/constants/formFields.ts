export const personalFields = [
  ['title', 'TITLE'],
  ['firstName', 'FIRST NAME'],
  ['middleName', 'MIDDLE NAME'],
  ['surname', 'SURNAME'],
  ['sex', 'SEX'],
  ['dateOfBirth', 'DATE OF BIRTH'],
  ['maritalStatus', 'MARITAL STATUS'],
  ['ninNumber', 'NIN NUMBER']
] as const;

export const contactFields = [
  ['nationality', 'NATIONALITY'],
  ['stateOfOrigin', 'STATE OF ORIGIN'],
  ['lga', 'LGA'],
  ['residentialAddress', 'RESIDENTIAL ADDRESS'],
  ['townCity', 'TOWN/CITY'],
  ['emailAddress', 'EMAIL ADDRESS'],
  ['phoneNumber', 'PHONE NUMBER']
] as const;

export const academicFields = [
  ['institutionName', 'INSTITUTION NAME'],
  ['faculty', 'FACULTY'],
  ['department', 'DEPARTMENT'],
  ['programmeType', 'PROGRAMME TYPE'],
  ['matriculationNumber', 'MATRICULATION NUMBER'],
  ['courseOfStudy', 'COURSE OF STUDY'],
  ['projectTopic', 'PROJECT TOPIC']
] as const;

export const personFields = [
  ['title', 'TITLE'],
  ['firstName', 'FIRST NAME'],
  ['middleName', 'MIDDLE NAME'],
  ['surname', 'SURNAME'],
  ['phoneNumber', 'PHONE NUMBER'],
  ['email', 'EMAIL']
] as const;

export const documentFields = [
  ['passport', 'WHITE BACKGROUND PASSPORT'],
  ['ninPicture', 'NIN PICTURE'],
  ['result', 'NOTIFICATION OF RESULT/STATEMENT OF RESULT'],
  ['certificationPage', 'SIGNED CERTIFICATION PAGE'],
  ['projectPdf', 'SOFT COPY PDF OF PROJECT']
] as const;
