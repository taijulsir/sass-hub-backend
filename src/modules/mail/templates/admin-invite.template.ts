export const adminInviteTemplate = (data: { userName: string, inviterName: string, inviteLink: string }) => {
  return {
    subject: `You've been invited to join SaaS Admin Hub`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>SaaS Admin Hub Invitation</h2>
        <p>Hi ${data.userName},</p>
        <p>You have been invited by <strong>${data.inviterName}</strong> to join the system as an administrator.</p>
        <div style="margin: 30px 0;">
          <a href="${data.inviteLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Accept Invitation</a>
        </div>
        <p>Or click this link: <a href="${data.inviteLink}">${data.inviteLink}</a></p>
        <p>This invitation will expire in 48 hours.</p>
        <hr/>
        <p style="font-size: 12px; color: #666;">If you didn't expect this invitation, you can ignore this email.</p>
      </div>
    `
  };
};
