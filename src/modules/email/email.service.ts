import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export class EmailService {
  private static transporter: nodemailer.Transporter;

  static async init() {
    if (env.nodeEnv !== 'test') {
      try {
        this.transporter = nodemailer.createTransport({
          host: env.email.host,
          port: env.email.port,
          secure: env.email.secure, // true for 465, false for other ports
          auth: {
            user: env.email.user,
            pass: env.email.pass,
          },
        });
        
        await this.transporter.verify();
        logger.info('Email service initialized');
      } catch (error) {
        logger.error('Failed to initialize email service', error);
      }
    }
  }

  static async sendInvitation(email: string, token: string, inviterName: string, organizationName: string) {
    const inviteUrl = `${env.frontendUrl}/accept-invite?token=${token}`;
    
    const mailOptions = {
        from: `"${organizationName}" <${env.email.from}>`,
        to: email,
        subject: `You've been invited to join ${organizationName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <h2 style="color: #333;">Invitation to join ${organizationName}</h2>
                <p style="color: #555;">Hello,</p>
                <p style="color: #555;"><strong>${inviterName}</strong> has invited you to join their organization on our platform.</p>
                <p style="color: #555;">Click the button below to accept the invitation:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${inviteUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Accept Invitation</a>
                </div>
                <p style="color: #555;">Or copy and paste this link into your browser:</p>
                <p style="color: #555; word-break: break-all;"><a href="${inviteUrl}">${inviteUrl}</a></p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px;">If you did not expect this invitation, you can ignore this email.</p>
            </div>
        `,
    };

    try {
        if (this.transporter) {
            await this.transporter.sendMail(mailOptions);
            logger.info(`Invitation email sent to ${email}`);
        } else {
            logger.warn('Email service not initialized, logging email content instead:');
            logger.info(JSON.stringify(mailOptions, null, 2));
        }
    } catch (error) {
        logger.error(`Failed to send invitation email to ${email}`, error);
        // We might not want to throw here to avoid failing the main request if email fails?
        // But usually user wants to know if email failed.
        // For now, let's just log error.
    }
  }
}
