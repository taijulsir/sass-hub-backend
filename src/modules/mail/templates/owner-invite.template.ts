export const ownerInviteTemplate = (data: { userName: string, organizationName: string, inviteLink: string }) => {
  return {
    subject: `You've been invited to join ${data.organizationName} on SaaS Admin Hub`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Invitation to join ${data.organizationName}</h2>
        <p>Hi ${data.userName},</p>
        <p>You have been invited to join <strong>${data.organizationName}</strong> on SaaS Admin Hub.</p>
        <p>Please click the button below to complete your registration and join the platform.</p>
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
