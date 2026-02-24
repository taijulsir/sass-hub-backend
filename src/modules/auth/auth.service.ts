import bcrypt from 'bcrypt';
import { User, IUserDocument } from '../user/user.model';
import { ApiError } from '../../utils/api-error';
import { generateTokenPair, verifyRefreshToken, verifyInvitationToken } from '../../utils/jwt';
import { TokenPair } from '../../types/interfaces';
import { GlobalRole } from '../../types/enums';
import { RegisterDto, LoginDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './auth.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../types/enums';
import crypto from 'crypto';
import { Membership } from '../membership/membership.model';
import { OrgRole } from '../../types/enums';
import { MailService } from '../mail/mail.service';
import { env } from '../../config/env';

export class AuthService {
  // Register a new user
  static async register(dto: RegisterDto & { token?: string }): Promise<{ user: IUserDocument; tokens: TokenPair }> {
    let email = dto.email.toLowerCase();
    let organizationId: string | undefined;

    // Verify invitation token if provided
    if (dto.token) {
      try {
        const decoded = verifyInvitationToken(dto.token);
        email = decoded.email.toLowerCase();
        organizationId = decoded.organizationId;
      } catch (error) {
        throw ApiError.badRequest('Invalid or expired invitation token');
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.conflict('User with this email already exists', 'EMAIL_EXISTS');
    }

    // Create user
    const user = await User.create({
      name: dto.name,
      email,
      password: dto.password,
      globalRole: GlobalRole.USER,
      isEmailVerified: !!dto.token, // Auto-verify if they came from an invite
    });

    // Send verification email if not an invite
    if (!dto.token) {
      // Generate a verification token (for this demo, we'll reuse the user ID or a separate token)
      const verificationLink = `${env.adminFrontendUrl}/verify-email?token=${user._id}`;
      await MailService.sendVerificationEmail(user.email, user.name, verificationLink);
    }

    // If an organization was part of the invite, join them
    if (organizationId) {
      await Membership.create({
        organizationId,
        userId: user._id,
        role: OrgRole.MEMBER, // Default role for invitees
        isActive: true,
      });
      
      await AuditService.log({
        organizationId,
        userId: user._id.toString(),
        action: AuditAction.INVITATION_ACCEPTED,
        resource: 'User',
        resourceId: user._id.toString(),
        metadata: { method: 'invitation' },
      });
    }

    // Generate tokens
    const tokens = generateTokenPair(
      user._id.toString(),
      user.email,
      user.globalRole
    );

    // Store hashed refresh token
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    user.refreshToken = hashedRefreshToken;
    await user.save();

    // Create audit log
    await AuditService.log({
      userId: user._id.toString(),
      action: AuditAction.USER_REGISTERED,
      metadata: { email: user.email },
    });

    return { user, tokens };
  }

  // Login user
  static async login(dto: LoginDto): Promise<{ user: IUserDocument; tokens: TokenPair; designation?: any }> {
    // Find user with password
    const user = await User.findByEmail(dto.email);
    if (!user) {
      throw ApiError.unauthorized('User not found with this email');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(dto.password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Wrong password');
    }

    // Generate tokens
    const tokens = generateTokenPair(
      user._id.toString(),
      user.email,
      user.globalRole
    );

    // Store hashed refresh token
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    user.refreshToken = hashedRefreshToken;
    await user.save();

    // Load designation + permissions for admin-panel users
    let designation: any = null;
    if (user.designationId) {
      const { Designation } = await import('../designation/designation.model');
      designation = await Designation.findById(user.designationId).lean();
    }

    // Create audit log
    await AuditService.log({
      userId: user._id.toString(),
      action: AuditAction.USER_LOGIN,
      metadata: { email: user.email },
    });

    return { user, tokens, designation };
  }

  // Refresh tokens
  static async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);

      // Find user
      const user = await User.findById(payload.userId).select('+refreshToken');
      if (!user || !user.refreshToken) {
        throw ApiError.unauthorized('Invalid refresh token');
      }

      // Verify stored refresh token
      const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isRefreshTokenValid) {
        throw ApiError.unauthorized('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = generateTokenPair(
        user._id.toString(),
        user.email,
        user.globalRole
      );

      // Store new hashed refresh token
      const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
      user.refreshToken = hashedRefreshToken;
      await user.save();

      return tokens;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }
  }

  // Logout user
  static async logout(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (user) {
      user.refreshToken = undefined;
      await user.save();

      // Create audit log
      await AuditService.log({
        userId: user._id.toString(),
        action: AuditAction.USER_LOGOUT,
      });
    }
  }

  // Change password
  static async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(dto.currentPassword);
    if (!isCurrentPasswordValid) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    // Update password
    user.password = dto.newPassword;
    user.refreshToken = undefined; // Invalidate all sessions
    await user.save();

    // Create audit log
    await AuditService.log({
      userId: user._id.toString(),
      action: AuditAction.PASSWORD_CHANGED,
    });
  }

  // Get current user
  static async getCurrentUser(userId: string): Promise<IUserDocument> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  // Forgot password
  static async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await User.findOne({ email: dto.email.toLowerCase() });
    if (!user) {
      // Don't throw error to prevent email enumeration
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set token and expiration (30 minutes as per requirements)
    user.set('resetPasswordToken', hashedToken);
    user.set('resetPasswordExpires', Date.now() + 30 * 60 * 1000);
    await user.save();

    // Enqueue forgot-password email
    const resetLink = `${env.adminFrontendUrl}/reset-password?token=${resetToken}`;
    await MailService.sendForgotPasswordEmail(user.email, user.name, resetLink);

    // Create audit log
    await AuditService.log({
      userId: user._id.toString(),
      action: AuditAction.PASSWORD_RESET_REQUESTED,
      metadata: { email: user.email },
    });
  }

  // Reset password
  static async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(dto.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }

    // Update password
    user.password = dto.newPassword;
    user.set('resetPasswordToken', undefined);
    user.set('resetPasswordExpires', undefined);
    user.refreshToken = undefined; // Invalidate all sessions
    await user.save();

    // Create audit log
    await AuditService.log({
      userId: user._id.toString(),
      action: AuditAction.PASSWORD_RESET_COMPLETED,
    });
  }
}
