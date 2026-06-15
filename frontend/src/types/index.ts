export type Overview = {
  links: number;
  activeLinks: number;
  revokedLinks: number;
  registrations: number;
  completed: number;
  uncompleted: number;
};

export type WorkerLink = {
  _id: string;
  workerFullName: string;
  url: string;
  isRevoked: boolean;
  registrationCount: number;
  createdAt: string;
  passcode?: string;
};

export type DocumentRecord = {
  kind: string;
  url: string;
  originalName: string;
};

export type Registration = {
  _id: string;
  status: 'completed' | 'uncompleted';
  personal: Record<string, string>;
  contact: Record<string, string>;
  academic: Record<string, string>;
  documents: DocumentRecord[];
  link: WorkerLink;
  createdAt: string;
};
