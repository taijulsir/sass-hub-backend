export const verifyEmailTemplate = (data: { userName: string, verificationLink: string }) => {
  return {
    subject: 'Verify your email address',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Welcome to SaaS Hub!</h2>
        <p>Hi ${data.userName},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <div style="margin: 30px 0;">
          <a href="${data.verificationLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Verify Email</a>
        </div>
        <p>Or click this link: <a href="${data.verificationLink}">${data.verificationLink}</a></p>
        <p>This link will expire in 24 hours.</p>
        <hr/>
        <p style="font-size: 12px; color: #666;">If you didn't create an account, you can ignore this email.</p>
      </div>
    `
  };
};
