export const forgotPasswordTemplate = (data: { userName: string, resetLink: string }) => {
  return {
    subject: 'Reset your password',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Reset your password</h2>
        <p>Hi ${data.userName},</p>
        <p>You requested to reset your password. Click the button below to continue:</p>
        <div style="margin: 30px 0;">
          <a href="${data.resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>Or click this link: <a href="${data.resetLink}">${data.resetLink}</a></p>
        <p>This link will expire in 30 minutes.</p>
        <hr/>
        <p style="font-size: 12px; color: #666;">If you didn't request a password reset, you can ignore this email.</p>
      </div>
    `
  };
};
