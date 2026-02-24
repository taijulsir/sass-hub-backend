import { Queue } from 'bullmq';
import { env } from '../../config/env';
import { MailJobData } from './mail.types';
import IORedis from 'ioredis';

const redisConnection = new IORedis({
  host: env.redis.host,
  port: env.redis.port,
  maxRetriesPerRequest: null,
});

export const mailQueue = new Queue<MailJobData>('email-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
  },
});

export const enqueueMail = async (data: MailJobData) => {
  await mailQueue.add(`${data.templateName}-${data.to}`, data);
};
