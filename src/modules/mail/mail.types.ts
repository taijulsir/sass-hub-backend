export enum MailStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export type TemplateName = 
  | 'register'
  | 'verify-email'
  | 'forgot-password'
  | 'reset-password'
  | 'admin-invite'
  | 'owner-invite';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export interface MailJobData {
  to: string;
  templateName: TemplateName;
  variables: Record<string, any>;
  metadata?: Record<string, any>;
}
