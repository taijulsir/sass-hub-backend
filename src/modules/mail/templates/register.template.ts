export const registerTemplate = (data: { userName: string }) => {
  return {
    subject: 'Welcome to SaaS Hub!',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Welcome to SaaS Hub!</h2>
        <p>Hi ${data.userName},</p>
        <p>Your account has been successfully created. We are excited to have you on board!</p>
        <p>If you have any questions, feel free to reply to this email.</p>
        <hr/>
        <p style="font-size: 12px; color: #666;">The SaaS Hub Team</p>
      </div>
    `
  };
};
