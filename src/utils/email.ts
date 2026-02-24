import { Resend } from "resend";
import { env } from "../config/env";

const resend = new Resend(env.RESEND_API_KEY);

interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
}

export const sendEmail = async (payload: EmailPayload) => {
  try {
    const { to, subject, html } = payload;
    const { data, error } = await resend.emails.send({
      from: "SaaS Admin Hub <no-reply@sass-admin.com>", // You should have a verified domain for this.
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Email send error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Internal Email Service Error:", error);
    return { success: false, error };
  }
};

export const getInvitationEmailTemplate = (name: string, organizationName: string, inviteLink: string) => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #333;">
      <h2 style="color: #4a90e2;">You've been invited!</h2>
      <p>Hi ${name},</p>
      <p>You have been invited by the administrator to join <strong>${organizationName}</strong> on SaaS Admin Hub.</p>
      <p>Please click the button below to complete your registration and join the platform.</p>
      <div style="margin-top: 30px;">
        <a href="${inviteLink}" 
           style="background-color: #4a90e2; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 5px; font-weight: bold; display: inline-block;">
           Join Organization
        </a>
      </div>
      <p style="margin-top: 30px; font-size: 12px; color: #777;">
        If you didn't expect this invitation, you can ignore this email.
        <br/>
        This link will expire in 24 hours.
      </p>
    </div>
  `;
};
