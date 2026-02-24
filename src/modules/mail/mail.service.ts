import { MailJobData, TemplateName } from './mail.types';
import { enqueueMail } from './mail.queue';

export class MailService {
  /**
   * Enqueue a verification email
   */
  static async sendVerificationEmail(to: string, userName: string, verificationLink: string) {
    await enqueueMail({
      to,
      templateName: 'verify-email',
      variables: { userName, verificationLink },
    });
  }

  /**
   * Enqueue a forgot password email
   */
  static async sendForgotPasswordEmail(to: string, userName: string, resetLink: string) {
    await enqueueMail({
      to,
      templateName: 'forgot-password',
      variables: { userName, resetLink },
    });
  }

  /**
   * Enqueue an admin invitation email
   */
  static async sendAdminInvite(to: string, userName: string, inviterName: string, inviteLink: string) {
    await enqueueMail({
      to,
      templateName: 'admin-invite',
      variables: { userName, inviterName, inviteLink },
    });
  }

  /**
   * Enqueue an organization owner invitation email
   */
  static async sendOwnerInvite(to: string, userName: string, organizationName: string, inviteLink: string) {
    await enqueueMail({
      to,
      templateName: 'owner-invite',
      variables: { userName, organizationName, inviteLink },
    });
  }

  /**
   * General-purpose send (can add more templates freely)
   */
  static async sendCustomMail(data: MailJobData) {
    await enqueueMail(data);
  }
}
