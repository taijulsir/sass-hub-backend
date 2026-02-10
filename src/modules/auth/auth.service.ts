import bcrypt from 'bcrypt';
import { User, IUserDocument } from '../user/user.model';
import { ApiError } from '../../utils/api-error';
import { generateTokenPair, verifyRefreshToken } from '../../utils/jwt';
import { TokenPair } from '../../types/interfaces';
import { GlobalRole } from '../../types/enums';
import { RegisterDto, LoginDto, ChangePasswordDto } from './auth.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../types/enums';

export class AuthService {
  // Register a new user
  static async register(dto: RegisterDto): Promise<{ user: IUserDocument; tokens: TokenPair }> {
    // Check if user already exists
    const existingUser = await User.findOne({ email: dto.email.toLowerCase() });
    if (existingUser) {
      throw ApiError.conflict('User with this email already exists', 'EMAIL_EXISTS');
    }

    // Create user
    const user = await User.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      password: dto.password,
      globalRole: GlobalRole.USER,
    });

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
  static async login(dto: LoginDto): Promise<{ user: IUserDocument; tokens: TokenPair }> {
    // Find user with password
    const user = await User.findByEmail(dto.email);
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(dto.password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
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
      action: AuditAction.USER_LOGIN,
      metadata: { email: user.email },
    });

    return { user, tokens };
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
}
