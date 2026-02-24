import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { MailJobData, MailStatus } from './mail.types';
import { MailLog } from './mail.model';
import { ResendProvider } from './providers/resend.provider';
import { verifyEmailTemplate } from './templates/verify-email.template';
import { forgotPasswordTemplate } from './templates/forgot-password.template';
import { adminInviteTemplate } from './templates/admin-invite.template';
import { ownerInviteTemplate } from './templates/owner-invite.template';
import { registerTemplate } from './templates/register.template';
import { logger } from '../../config/logger';

import { env } from '../../config/env';

const redisConnection = new IORedis({
  host: env.redis.host,
  port: env.redis.port,
  maxRetriesPerRequest: null,
});

const provider = new ResendProvider();

export const mailWorker = new Worker<MailJobData>('email-queue', async (job: Job<MailJobData>) => {
  const { to, templateName, variables, metadata } = job.data;
  
  let templateResult: { subject: string; html: string };
  
  switch (templateName) {
    case 'register':
      templateResult = registerTemplate(variables as any);
      break;
    case 'verify-email':
      templateResult = verifyEmailTemplate(variables as any);
      break;
    case 'forgot-password':
      templateResult = forgotPasswordTemplate(variables as any);
      break;
    case 'admin-invite':
      templateResult = adminInviteTemplate(variables as any);
      break;
    case 'owner-invite':
      templateResult = ownerInviteTemplate(variables as any);
      break;
    default:
      throw new Error(`Template not found: ${templateName}`);
  }

  // Create PENDING log
  const log = await MailLog.create({
    to,
    subject: templateResult.subject,
    templateName,
    status: MailStatus.PENDING,
    attempts: job.attemptsMade + 1,
    provider: provider.name,
    metadata,
  });

  try {
    await provider.send({
      to,
      subject: templateResult.subject,
      html: templateResult.html,
    });

    // Update log to SENT
    log.status = MailStatus.SENT;
    log.sentAt = new Date();
    await log.save();
    
    logger.info(`Email sent to ${to} for job ${job.id}`);
  } catch (error: any) {
    // Update log on failure
    log.status = MailStatus.FAILED;
    log.errorMessage = error.message;
    await log.save();
    
    logger.error(`Failed to send email to ${to} for job ${job.id}: ${error.message}`);
    throw error; // Let Bull handle retries
  }
}, {
  connection: redisConnection,
  concurrency: 5,
});

mailWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed after ${job?.attemptsMade} attempts: ${err.message}`);
});
