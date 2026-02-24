import mongoose, { Schema, Document } from 'mongoose';
import { MailStatus } from './mail.types';

export interface IMailLog extends Document {
  to: string;
  subject: string;
  templateName: string;
  status: MailStatus;
  attempts: number;
  provider: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  sentAt?: Date;
}

const MailLogSchema: Schema = new Schema({
  to: { type: String, required: true },
  subject: { type: String, required: true },
  templateName: { type: String, required: true },
  status: { type: String, enum: Object.values(MailStatus), default: MailStatus.PENDING },
  attempts: { type: Number, default: 0 },
  provider: { type: String, required: true },
  errorMessage: { type: String },
  metadata: { type: Schema.Types.Mixed },
  sentAt: { type: Date },
}, { timestamps: true });

export const MailLog = mongoose.model<IMailLog>('MailLog', MailLogSchema);
